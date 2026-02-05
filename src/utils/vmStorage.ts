/**
 * VM (Virtual Machine) Storage Utilities
 * File-based storage for VM definitions
 * Stores data in data/vms.json
 */

import * as fs from 'fs';
import * as path from 'path';

import { logger } from './logger';

import { VM } from '@/types/teamVault';

// File path for VM storage
const VMS_FILE_PATH = path.join(process.cwd(), 'data', 'vms.json');

/**
 * Ensure the VMs file exists
 */
function ensureVMsFile(): void {
  const dataDir = path.dirname(VMS_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(VMS_FILE_PATH)) {
    const emptyVMs: VM[] = [];
    fs.writeFileSync(VMS_FILE_PATH, JSON.stringify(emptyVMs, null, 2));
    logger.info(`Created VMs file: ${VMS_FILE_PATH}`);
  }
}

/**
 * Load all VMs from storage
 */
function loadVMs(): VM[] {
  ensureVMsFile();

  try {
    const content = fs.readFileSync(VMS_FILE_PATH, 'utf-8');
    return JSON.parse(content) as VM[];
  } catch (error) {
    logger.error('Error reading VMs file:', error);
    return [];
  }
}

/**
 * Save VMs to storage
 */
function saveVMs(vms: VM[]): void {
  ensureVMsFile();
  fs.writeFileSync(VMS_FILE_PATH, JSON.stringify(vms, null, 2));
  logger.debug(`Saved ${vms.length} VMs to storage`);
}

/**
 * List all VMs
 */
export function listVMs(scope?: 'global' | 'team-specific'): VM[] {
  const vms = loadVMs();

  if (scope) {
    return vms.filter(vm => vm.scope === scope);
  }

  return vms;
}

/**
 * Get a single VM by ID
 */
export function getVM(id: string): VM | null {
  const vms = loadVMs();
  return vms.find(vm => vm.id === id) || null;
}

/**
 * Create a new VM
 */
export function createVM(vmData: Omit<VM, 'createdAt' | 'updatedAt'>): VM {
  const vms = loadVMs();

  // Check if ID already exists
  if (vms.some(vm => vm.id === vmData.id)) {
    throw new Error(`VM with ID '${vmData.id}' already exists`);
  }

  const now = new Date().toISOString();
  const newVM: VM = {
    ...vmData,
    createdAt: now,
    updatedAt: now,
  };

  vms.push(newVM);
  saveVMs(vms);

  logger.info(`Created VM: ${newVM.id} (${newVM.name})`);
  return newVM;
}

/**
 * Update an existing VM
 */
export function updateVM(
  id: string,
  updates: Partial<Omit<VM, 'id' | 'createdAt' | 'updatedAt'>>
): VM | null {
  const vms = loadVMs();
  const index = vms.findIndex(vm => vm.id === id);

  if (index < 0) {
    return null;
  }

  vms[index] = {
    ...vms[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveVMs(vms);
  logger.info(`Updated VM: ${id}`);
  return vms[index];
}

/**
 * Delete a VM
 */
export function deleteVM(id: string): boolean {
  const vms = loadVMs();
  const originalLength = vms.length;

  const filteredVMs = vms.filter(vm => vm.id !== id);

  if (filteredVMs.length < originalLength) {
    saveVMs(filteredVMs);
    logger.info(`Deleted VM: ${id}`);
    return true;
  }

  return false;
}

/**
 * Get VMs visible to a specific team
 * Returns global VMs + team-specific VMs for that team
 */
export function getVMsForTeam(teamId: string): VM[] {
  const vms = loadVMs();

  return vms.filter(
    vm => vm.scope === 'global' || (vm.scope === 'team-specific' && vm.teamId === teamId)
  );
}

/**
 * Get VMs by scope
 */
export function getVMsByScope(scope: 'global' | 'team-specific'): VM[] {
  return listVMs(scope);
}

/**
 * Get VMs by OS type
 */
export function getVMsByOSType(osType: VM['osType']): VM[] {
  const vms = loadVMs();
  return vms.filter(vm => vm.osType === osType);
}

/**
 * Check if a VM ID exists
 */
export function vmExists(id: string): boolean {
  const vms = loadVMs();
  return vms.some(vm => vm.id === id);
}

/**
 * Get VM usage count (how many credentials reference this VM)
 * This requires checking all team vaults
 */
export function getVMUsageCount(vmId: string): number {
  // Import team storage dynamically
  const { listTeams, getTeamVault } = require('./teamStorage');
  const { getAllSharedCredentials } = require('./sharedStorage');

  let count = 0;

  // Check team vaults
  const teamIds = listTeams();
  for (const teamId of teamIds) {
    const vault = getTeamVault(teamId);
    if (vault) {
      count += vault.credentials.filter(c => c.vmIds.includes(vmId)).length;
    }
  }

  // Check shared credentials
  const sharedCredentials = getAllSharedCredentials();
  count += sharedCredentials.filter(c => c.vmIds.includes(vmId)).length;

  return count;
}

/**
 * Get VMs with usage counts
 * Returns VMs enriched with credential count
 */
export function getVMsWithUsage(): Array<VM & { usageCount: number }> {
  const vms = loadVMs();

  return vms.map(vm => ({
    ...vm,
    usageCount: getVMUsageCount(vm.id),
  }));
}
