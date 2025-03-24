import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = '' }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center ${className}`}>
      <div className="relative h-8 w-8 mr-2">
        <Image
          src="/favicon.svg"
          alt="Hash Cracker Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
      <span className="font-bold text-xl">Hash Cracker</span>
    </Link>
  );
}
