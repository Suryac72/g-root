#!/usr/bin/env node

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import chalk from "chalk";
import { diffLines } from "diff";
import { Command } from "commander";
import ignore from "ignore";

const program = new Command();

/**
 * Implementation at prototype level of git
 * In this implementation, we implement basic level of operations which git does for keep tracking our files
 * Following operations we implement in this:
 * 1)git init
 * 2)git add
 * 3)git commit
 * 4)git log
 * 5)git diff
 * 6)git status
 * 7)git add .
 * 8)git stash
 * 9).gitignore
 */

class GRoot {
  /**
   * Defining constructor which initialize basic Version controlling folder structure for files tracking
   * @param {*} repoPath
   */
  constructor(repoPath = ".") {
    this.repoPath = path.join(repoPath, ".groot"); // /.groot
    this.objectsPath = path.join(this.repoPath, "objects"); //.groot/objects
    this.headPath = path.join(this.repoPath, "HEAD"); //.groot/HEAD
    this.indexPath = path.join(this.repoPath, "index"); //.groot/index
    this.stashPath = path.join(this.repoPath, "stash");
    this.ignoreManager = ignore();
    this.init();
  }

  /**
   * Method to initalize our gRoot inside our current working directory
   */
  async init() {
    await fs.mkdir(this.objectsPath, { recursive: true });
    try {
      await fs.writeFile(this.headPath, "", { flag: "wx" }); //wx ---> w: write, x: exclusive (o/p fails if file exists) open for writing, fails if file exists
      await fs.writeFile(this.indexPath, JSON.stringify([]), { flag: "wx" });
      await fs.writeFile(this.stashPath, JSON.stringify([]), { flag: "wx" });

      // Load .grootignore if it exists
      const grootignorePath = path.join(process.cwd(), ".grootignore");
      try {
        const grootignoreContent = await fs.readFile(grootignorePath, "utf-8");
        this.ignoreManager.add(grootignoreContent);
      } catch (err) {
        // Ignore error if .grootignore does not exist
      }
    } catch (error) {
      return;
    }
  }

  /**
   * method to create hash object
   * @param {*} content
   * @returns
   */
  hashObject(content) {
    return crypto.createHash("sha1").update(content, "utf-8").digest("hex");
  }

  /**
   * Helper method to get all files in a directory recursively
   * @param {*} dir
   * @returns
   */
  async getAllFiles(dir, allFiles = []) {
    const files = await fs.readdir(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);

      // Skip ignored files and directories
      if (this.ignoreManager.ignores(path.relative(process.cwd(), filePath))) {
        continue;
      }

      if (stat.isDirectory()) {
        await this.getAllFiles(filePath, allFiles);
      } else {
        allFiles.push(filePath);
      }
    }

    return allFiles;
  }

  /**
   * Method to add all files in the directory to the staging area
   */
  async addAll() {
    const files = await this.getAllFiles(".");
    for (const file of files) {
      await this.add(file);
    }
  }

  /**
   * Method to add file into staging area
   * @param {*} fileToBeAdded
   */
  async add(fileToBeAdded) {
    const fileData = await fs.readFile(fileToBeAdded, { encoding: "utf-8" });
    const fileHash = this.hashObject(fileData);
    const newFileHashObjectPath = path.join(this.objectsPath, fileHash); //.groot/objects/abcs1345.....
    await fs.writeFile(newFileHashObjectPath, fileData);
    await this.updateStagingArea(fileToBeAdded, fileHash);
  }

  /**
   * Method to Update changes to staging Area
   * @param {*} filePath
   * @param {*} fileHash
   */
  async updateStagingArea(filePath, fileHash) {
    const index = JSON.parse(
      await fs.readFile(this.indexPath, { encoding: "utf-8" })
    ); //read the index
    index.push({ path: filePath, hash: fileHash }); //add the file to the index
    await fs.writeFile(this.indexPath, JSON.stringify(index)); // write the updated index file
  }

  /**
   * Method to commit changes
   * @param {*} message
   */
  async commit(message) {
    const index = JSON.parse(
      await fs.readFile(this.indexPath, { encoding: "utf-8" })
    );
    const parentCommit = await this.getCurrentHead();

    const commitData = {
      timeStamp: new Date().toISOString(),
      message,
      files: index,
      parent: parentCommit,
    };

    const commitHash = this.hashObject(JSON.stringify(commitData));
    const commitPath = path.join(this.objectsPath, commitHash);
    await fs.writeFile(commitPath, JSON.stringify(commitData));
    await fs.writeFile(this.headPath, commitHash); //update the HEAD to point to new commit
    await fs.writeFile(this.indexPath, JSON.stringify([]));

    console.info(`Commit successfully created: ${commitHash}`);
  }

  /**
   * Method to get current Hash on which HEAD is pointing
   * @returns
   */
  async getCurrentHead() {
    try {
      return await fs.readFile(this.headPath, { encoding: "utf-8" });
    } catch (error) {}
  }

  /**
   * Method to print commit history of all changes
   */
  async log() {
    let currentCommitHash = await this.getCurrentHead();
    while (currentCommitHash) {
      const commitData = JSON.parse(
        await fs.readFile(path.join(this.objectsPath, currentCommitHash), {
          encoding: "utf-8",
        })
      );
      console.log(
        `Commit: ${currentCommitHash}\nDate: ${commitData.timeStamp}\n\n${commitData.message}`
      );

      currentCommitHash = commitData.parent;
    }
  }

  /**
   * MEthod to get Data from commitHash which it contains
   * @param {*} commitHash
   * @returns
   */
  async getCommitData(commitHash) {
    const commitPath = path.join(this.objectsPath, commitHash);
    try {
      return await fs.readFile(commitPath, { encoding: "utf-8" });
    } catch (error) {
      console.log("failed to read the commit data".error);
      return null;
    }
  }

  /**
   * Method to get file content from fileHash
   * @param {} fileHash
   * @returns
   */
  async getFileContent(fileHash) {
    const objectPath = path.join(this.objectsPath, fileHash);
    return await fs.readFile(objectPath, { encoding: "utf-8" });
  }

  /**
   * Method to fetch file difference w.r.t commitHash
   * @param {*} commitHash
   * @returns
   */
  async showCommitDiff(commitHash) {
    const commitData = JSON.parse(await this.getCommitData(commitHash));
    if (!commitData) {
      console.log("Commit not found");
      return;
    }
    console.log("Changes in the last commit are: ");
    for (const file of commitData.files) {
      console.log(`File: ${file.path}`);
      const fileContent = await this.getFileContent(file.hash);
      console.log(fileContent);

      if (commitData.parent) {
        //get the parent commit data
        const parentCommitData = JSON.parse(
          await this.getCommitData(commitData.parent)
        );
        const getParentFileContent = await this.getParentFileContent(
          parentCommitData,
          file.path
        );

        if (getParentFileContent !== undefined) {
          console.log("\nDiff:");
          const diff = diffLines(getParentFileContent, fileContent);

          diff.forEach((part) => {
            //if new line added
            if (part.added) {
              process.stdout.write(chalk.green("+++ " + part.value));
            }
            //if line is removed
            else if (part.removed) {
              process.stdout.write(chalk.red("--- " + part.value));
            }
            //if nothing has changed
            else {
              process.stdout.write(chalk.grey(part.value));
            }
            console.log();
          });
        }
        // if no file in parent then print this
        else {
          console.log("New files in this commit");
        }
      }
      //if no file is present then log this
      else {
        console.log("First Commit");
      }
    }
  }

  /**
   * Method to fetch contents of file which are present in parentCommit hash
   * @param {*} parentCommitData
   * @param {*} filePath
   * @returns
   */
  async getParentFileContent(parentCommitData, filePath) {
    const parentFile = parentCommitData.files.find(
      (file) => file.path === filePath
    );
    if (parentFile) {
      //get the file content from parent and commit and return the content
      return await this.getFileContent(parentFile.hash);
    }
  }

  /**
   * Method to show the status of files
   */
  async status() {
    const index = JSON.parse(
      await fs.readFile(this.indexPath, { encoding: "utf-8" })
    );
    const headCommitHash = await this.getCurrentHead();
    const headCommitData = headCommitHash
      ? JSON.parse(await this.getCommitData(headCommitHash))
      : { files: [] };
    const headFiles = headCommitData.files.reduce((acc, file) => {
      acc[file.path] = file.hash;
      return acc;
    }, {});

    const currentFiles = await this.getAllFiles(".");
    const currentFileHashes = {};

    for (const file of currentFiles) {
      const fileData = await fs.readFile(file, { encoding: "utf-8" });
      const fileHash = this.hashObject(fileData);
      currentFileHashes[file] = fileHash;
    }

    console.log("Changes to be committed:");
    index.forEach((file) => {
      console.log(`  ${chalk.green("modified")}: ${file.path}`);
    });

    console.log("\nChanges not staged for commit:");
    for (const file of currentFiles) {
      if (
        !index.find((stagedFile) => stagedFile.path === file) &&
        headFiles[file] !== currentFileHashes[file]
      ) {
        console.log(`  ${chalk.red("modified")}: ${file}`);
      }
    }

    console.log("\nUntracked files:");
    for (const file of currentFiles) {
      if (
        !index.find((stagedFile) => stagedFile.path === file) &&
        !headFiles[file]
      ) {
        console.log(`  ${chalk.red("new file")}: ${file}`);
      }
    }
  }

  /**
   * Method to stash changes
   * Saves the current state of the working directory and index
   */
  async stash() {
    const index = JSON.parse(
      await fs.readFile(this.indexPath, { encoding: "utf-8" })
    );
    const stash = JSON.parse(
      await fs.readFile(this.stashPath, { encoding: "utf-8" })
    );

    stash.push({
      timeStamp: new Date().toISOString(),
      files: index,
    });

    await fs.writeFile(this.stashPath, JSON.stringify(stash));
    await fs.writeFile(this.indexPath, JSON.stringify([]));

    console.info("Changes stashed successfully.");
  }
}

program.command("init").action(async () => {
  const gRoot = new GRoot();
});

program.command("add <file>").action(async (file) => {
  const gRoot = new GRoot();
  if (file === ".") {
    await gRoot.addAll();
  } else {
    await gRoot.add(file);
  }
});

program.command("commit <message>").action(async (message) => {
  const gRoot = new GRoot();
  await gRoot.commit(message);
});

program.command("log").action(async () => {
  const gRoot = new GRoot();
  await gRoot.log();
});

program.command("show <commitHash>").action(async (commitHash) => {
  const gRoot = new GRoot();
  await gRoot.showCommitDiff(commitHash);
});

program.command("status").action(async () => {
  const gRoot = new GRoot();
  await gRoot.status();
});

program.command("stash").action(async () => {
  const gRoot = new GRoot();
  await gRoot.stash();
});

program.parse(process.argv);
