# GRoot

GRoot is a simplified version control system implemented in Node.js. It mimics basic functionalities of Git, such as tracking changes, committing updates, and managing a staging area. GRoot is designed for educational purposes to help understand the core concepts of version control.

## Features

- **Initialize Repository**: Set up a new GRoot repository.
- **Add Files**: Stage files or directories for tracking.
- **Commit Changes**: Save changes to the repository with a message.
- **View Commit History**: List all commits with their details.
- **Show Commit Differences**: Compare changes between commits.
- **Check Status**: View the status of the working directory and staging area.
- **Stash Changes**: Temporarily save changes for later use.
- **Ignore Files**: Use `.grootignore` to exclude files and directories from version control.


## groot Commands

- **groot init**: Initialize Repository
- **groot add file-name**: Stage files or directories for tracking.
- **groot add .** : Stage all files or directories for tracking.
- **groot commit -m message**: Save changes to the repository with a message.
- **groot log**: List all commits with their details.
- **groot diff**: Compare changes between commits.
- **groot status**: View the status of the working directory and staging area.
- **groot stash**: Temporarily save changes for later use.


## Installation

To use GRoot, you need Node.js and npm installed on your machine. Follow these steps to install GRoot globally:

1. **Install Node.js and npm**

   If you don't have Node.js and npm installed, download and install them from the [official Node.js website](https://nodejs.org/).

2. **Install GRoot**

   Open your terminal and run the following command to install GRoot globally:

   ```sh
   npm install -g surya-groot
