const https = require('https');
const fs = require('fs');

const SA_DIR = '/var/run/secrets/kubernetes.io/serviceaccount';
const token = fs.readFileSync(`${SA_DIR}/token`, 'utf8').trim();
const ca = fs.readFileSync(`${SA_DIR}/ca.crt`);
const NAMESPACE = process.env.WATCH_NAMESPACE || 'default';
const INTERVAL_MS = 5000;

function api(method, path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      host: process.env.KUBERNETES_SERVICE_HOST,
      port: process.env.KUBERNETES_SERVICE_PORT,
      path,
      method,
      ca,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : {});
        } else {
          reject(new Error(`${method} ${path} -> HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Rule: pod ko Deployment (ReplicaSet) manage karna chahiye, ya approved label ho
function checkPod(pod) {
  const labels = pod.metadata.labels || {};
  if (labels['cloudshield.io/approved'] === 'true') return null;
  const owners = pod.metadata.ownerReferences || [];
  const managed = owners.some((o) => o.kind === 'ReplicaSet');
  if (!managed) return 'pod is not managed by a Deployment (unknown workload)';
  return null;
}

const handled = new Set();

async function scan() {
  const list = await api('GET', `/api/v1/namespaces/${NAMESPACE}/pods`);
  for (const pod of list.items) {
    const name = pod.metadata.name;
    if (pod.metadata.deletionTimestamp || handled.has(name)) continue;
    const reason = checkPod(pod);
    if (!reason) continue;
    handled.add(name);
    console.log(JSON.stringify({ time: new Date().toISOString(), event: 'SECURITY_INCIDENT', pod: name, reason, action: 'delete_pod' }));
    await api('DELETE', `/api/v1/namespaces/${NAMESPACE}/pods/${name}`);
    console.log(JSON.stringify({ time: new Date().toISOString(), event: 'RESPONSE_DONE', pod: name }));
  }
}

console.log(`cloudshield-watcher started, watching namespace "${NAMESPACE}"`);
setInterval(() => {
  scan().catch((err) => console.error('scan error:', err.message));
}, INTERVAL_MS);
