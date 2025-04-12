const fs = require('fs');
const path = require('path');

// Blocking file read example
const blockingRead = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data;
    } catch (error) {
        throw new Error(`Error reading file: ${error.message}`);
    }
};

// Non-blocking file read example using promises
const nonBlockingRead = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (error, data) => {
            if (error) {
                reject(new Error(`Error reading file: ${error.message}`));
            } else {
                resolve(data);
            }
        });
    });
};

// Non-blocking file read example using fs.promises
const nonBlockingReadPromises = async (filePath) => {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        return data;
    } catch (error) {
        throw new Error(`Error reading file: ${error.message}`);
    }
};

module.exports = {
    blockingRead,
    nonBlockingRead,
    nonBlockingReadPromises
}; 