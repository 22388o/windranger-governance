'use strict';

const {contract} = require('hardhat');
const {promisify} = require('util');
const {resolve} = require('path');
const fs = require('fs');

const EIP170 = 24576;
const CONTRACTS = `${__dirname}/../artifacts/contracts`;
const READDIR = promisify(fs.readdir);
const STAT = promisify(fs.stat);
const LIST = ['Governance.sol'];

async function generateReport() {
  let bytecodeSize;
  let contractData;
  let result = {};
  let file;
  let files = await getFiles(CONTRACTS);

  for (let i = 0; i < files.length; i++) {
    file = files[i];
    contractData = JSON.parse(fs.readFileSync(file));

    if (contractData.deployedBytecode !== undefined) {
      bytecodeSize = contractData.deployedBytecode.length / 2 - 1;

      if (bytecodeSize > 0) {
        file = file.replace(/^.*[\\\/]/, '');
        file = `${file.substring(0, file.length - 5)}.sol`;
        result[file] = bytecodeSize;
      }
    }
  }

  return result;
}

async function getFiles(dir) {
  const subdirs = await READDIR(dir);
  const files = await Promise.all(
    subdirs.map(async (subdir) => {
      const res = resolve(dir, subdir);
      return (await STAT(res)).isDirectory() ? getFiles(res) : res;
    })
  );

  return files.reduce((a, f) => a.concat(f), []);
}

async function main() {
  const report = await generateReport();
  let size;
  let exceeds;
  let diffDict = {};
  let result = {};

  for (let contract in report) {
    if (LIST.includes(contract)) {
      size = report[contract];

      diffDict[contract] = {
        size: size,
        exceeds_EIP170: size > EIP170,
      };
    }
  }

  Object.keys(diffDict)
    .sort((x, y) => {
      return diffDict[y].size - diffDict[x].size;
    })
    .forEach((key) => {
      result[key] = diffDict[key];
    });

  console.log('CONTRACT BYTECODE SIZE CHANGES');
  console.table(result);
}

main();
