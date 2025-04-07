# Bus Tracker Readme
#readme
#coding
Version 5

# BusTracker

BusTracker is a multi-tenant bus tracking application designed for schools. It leverages Google Sheets for data storage (each school retains its own data), while our hosted code—a Node.js backend and a React frontend—provides a real-time dashboard for monitoring bus statuses, student check-ins, and route information.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [CI/CD](#cicd)
- [Contributing](#contributing)
- [License](#license)

## Overview
BusTracker provides schools with a secure, scalable, and easy-to-use system to manage their bus operations. By integrating with the Google Sheets API via OAuth, the application ensures that each school’s data remains isolated and secure while still offering a rich, real-time user experience.

## Features
- **Multi-Tenant Architecture:** Each school’s data is stored in its own Google Sheet.
- **Real-Time Dashboard:** Live updates on bus statuses, student check-ins, and route information.
- **Express API Backend:** A Node.js (Express) server acting as a secure proxy between the frontend and Google Sheets.
- **React Frontend:** A modern, responsive UI built with React, Tailwind CSS, and daisyUI.
- **CI/CD Integration:** Automated testing and deployment using GitHub Actions.

## Project Structure
BusTracker/
├── .github/              # GitHub Actions workflows
│   └── workflows/
│       └── ci.yml        # CI pipeline configuration
├── client/               # React frontend application
├── server/               # Node.js backend (Express server)
│   ├── index.js          # Main server file
│   └── package.json      # Backend dependencies
├── .gitignore            # Git ignore file
└── README.md             # Project documentation (this file)

## Installation

### Prerequisites
- **Node.js** (version 16.x or higher)
- **npm** (comes with Node.js)
- **Git**

### Setup Instructions

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/tgedtech/BusTracker.git
   cd BusTracker
   
2. **Install Root-Level Dependencies (Optional for Concurrent Setup):**
   ```bash
   npm install
   ```
3. **Set Up the Backend**
   ```bash
   cd server
   npm install
   ```
4. **Set Up the Frontend**
   ```bash
   cd ../client
   npm install
   ```

## Usage
### Running Concurrently
From the repository root, run:
```bash
	npm start
```
This will start both the Express server (default port is 4000) and the React client (default port 3000) concurrently.

### Running Individually
* **Backend:**
  ```bash
    cd server
    node index.js
  ```

* **Frontend:**
  ```bash
    cd client
    npm start
  ```

### Testing the Backend API
You can test the API endpoint with curl:
```bash
	curl -v http://localhost:4000/api
```

Expected output:
```json
	{"message": "Hello from the Express server!"}
```

### CI/CD
This project uses GitHub Actions for continuous integration. The workflow file is located at .github/workflows/ci.yml and is configured to run on pushes and pull requests to the develop and main branches. The CI pipeline includes:
* Code checkout
* Node.js setup
* Dependency installation (npm install)
* Running tests (currently a placeholder script)

### Contributing
Contributions are welcome! Please follow these guidelines:
* **Branching:** Create feature branches off of the develop branch.
* **Pull Requests:** Submit pull requests for review. Ensure that all changes pass CI checks before merging.
* **Commit Messages:** Write clear and descriptive commit messages.
