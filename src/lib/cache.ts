import NodeCache from 'node-cache';

// TTL = 2 hours (7200 seconds)
const cache = new NodeCache({ stdTTL: 7200, checkperiod: 600 });

export default cache;
