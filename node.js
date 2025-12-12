// node.js
const DHTNode = require('./dhtNode');

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log("Usage: node node.js <port> [bootstrapPort]");
    process.exit(1);
}
const port = parseInt(args[0], 10);
const bootstrap = args[1] ? parseInt(args[1], 10) : null;

new DHTNode(port, bootstrap);
