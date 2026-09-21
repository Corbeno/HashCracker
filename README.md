# HashCracker

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Contributors](https://img.shields.io/github/contributors/Corbeno/HashCracker)
![Issues](https://img.shields.io/github/issues/Corbeno/HashCracker)

## Description

A hashcat wrapper built for simplicity. You define your attack modes, including wordlists, rules, and masks. This enables quick running of hashcat!

This app was originally made for cyber defence competitions, where cracking hashes quickly is very important.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Roadmap](#roadmap)
- [Contact](#contact)

## Installation

Note: In the future this will be in a docker container

1. Clone the repository:
   ```sh
   git clone https://github.com/Corbeno/HashCracker.git
   ```
2. Navigate into the directory:
   ```sh
   cd HashCracker
   ```
3. Install dependencies:
   ```sh
   npm install
   ```
4. Run the dev instance

```
npm run dev
```

## Usage

Input your hashes, pick their type, pick an attack mode, and queue the job!
<img width="1351" height="862" alt="image" src="https://github.com/user-attachments/assets/545141bc-21a7-4522-b1b2-443b4e98b76b" />


## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature-name`).
3. Commit your changes (`git commit -m 'Add new feature'`).
4. Push to the branch (`git push origin feature-name`).
5. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Roadmap

- [ ] Feature 1: Create a docker container for this application for easier running
- [ ] Feature 2: Re-work the configuation options to be better suited for a docker container

## Contact

For questions or feedback, reach out to:

- GitHub: [Corbeno](https://github.com/Corbeno)
