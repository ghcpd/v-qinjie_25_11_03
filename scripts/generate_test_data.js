const fs = require('fs');

const malicious = [
  { username: "admin" },
  { username: "admin' OR '1'='1" },
  { username: "test'; DROP TABLE users; --" },
  { username: "normal_user" },
  { username: "'; SHUTDOWN; --" },
  { username: "__proto__" },
  { username: "a".repeat(60) }
];

fs.writeFileSync('test_inputs.json', JSON.stringify(malicious, null, 2));
console.log('Generated test_inputs.json');
