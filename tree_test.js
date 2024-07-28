const assert = require('assert');
const net = require('net');
const Tree = require('./geo');

describe('Tree', function () {
  describe('#find()', function () {
    it('should find the correct city for given IPs', function () {
      const tree = new Tree();

      const cidrs = [
        '192.168.0.0/24',
        '192.168.0.0/16',
        '10.0.0.0/8',
        '172.1.2.3/32'
      ];

      cidrs.forEach(cidr => {
        const [_, ipNet] = cidr.split('/');
        const ipBuffer = net.isIPv4(cidr.split('/')[0]) ? ip6.toBuffer(cidr.split('/')[0]) : cidr.split('/')[0];
        const ip = `${ipBuffer.join('.')}/${ipNet}`;
        tree.insert(ip, { country: cidr });
      });

      const testCases = [
        { ip: '192.168.0.10', exists: true, cidr: '192.168.0.0/24' },
        { ip: '192.168.1.10', exists: true, cidr: '192.168.0.0/16' },
        { ip: '192.169.1.10', exists: false, cidr: '' },
        { ip: '172.1.2.3', exists: true, cidr: '172.1.2.3/32' },
      ];

      testCases.forEach(tc => {
        const city = tree.find(tc.ip);
        if (!city && tc.exists) {
          assert.fail(`CIDR for IP ${tc.ip} wasn't found, expected ${tc.cidr}`);
        }

        if (city && !tc.exists) {
          assert.fail(`CIDR for IP ${tc.ip} was found (${tc.cidr}), expected nil`);
        }

        if (city && city.country !== tc.cidr) {
          assert.fail(`CIDR for IP ${tc.ip} is ${city.country}, expected ${tc.cidr}`);
        }
      });
    });
  });
});
