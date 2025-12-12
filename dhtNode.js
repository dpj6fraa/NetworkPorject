// dhtNode.js
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

class DHTNode {
    constructor(port, bootstrap = null) {
        this.port = port;
        this.nodeId = crypto.randomBytes(4).toString('hex'); // small id
        this.peers = new Set();
        this.data = {}; // key-value local storage

        const app = express();
        app.use(express.json());

        app.post('/join', (req, res) => {
            const peer = req.body.peer;
            if (peer) this.peers.add(peer);
            res.json({ id: this.nodeId, port: this.port, peers: [...this.peers] });
        });

        app.post('/store', (req, res) => {
            const { key, value } = req.body;
            if (!key) return res.status(400).json({ error: "missing key" });
            this.data[key] = value;
            res.json({ status: "stored", on: this.port, key });
        });

        app.get('/find/:key', async (req, res) => {
            const key = req.params.key;
            if (this.data.hasOwnProperty(key)) {
                return res.json({ found: true, value: this.data[key], port: this.port });
            }
            // Ask peers sequentially (simple)
            for (const p of [...this.peers]) {
                try {
                    const r = await axios.get(`${p}/find/${encodeURIComponent(key)}`, { timeout: 2000 });
                    if (r.data && r.data.found) {
                        return res.json({
                            found: true,
                            value: r.data.value,
                            holder: r.data.port || r.data.holder
                        });
                    }
                } catch (e) {
                    // peer failed — remove from routing table
                    this.peers.delete(p);
                }
            }
            return res.json({ found: false, peers: [...this.peers] });
        });

        app.get('/status', (req, res) => {
            res.json({
                nodeId: this.nodeId,
                port: this.port,
                peers: [...this.peers],
                data: this.data
            });
        });

        app.listen(port, () => {
            console.log(`DHT Node ${this.nodeId} running at http://localhost:${this.port}`);
            if (bootstrap) this.joinNetwork(bootstrap);
        });
    }

    async joinNetwork(targetPort) {
        const target = `http://localhost:${targetPort}`;
        console.log(`Attempting to join via ${target}`);
        try {
            const resp = await axios.post(`${target}/join`, { peer: `http://localhost:${this.port}` }, { timeout: 2000 });
            // Add the bootstrap back and any peers returned
            this.peers.add(target);
            if (resp.data && resp.data.peers) {
                resp.data.peers.forEach(p => this.peers.add(p));
            }
            console.log(`Joined network via ${target}`);
        } catch (e) {
            console.log(`Join failed: ${e.message}`);
        }
    }
}

module.exports = DHTNode;


