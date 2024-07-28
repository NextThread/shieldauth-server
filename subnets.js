const { Netmask } = require('netmask');
const AsyncLock = require('async-lock');

class Subnets {
  constructor() {
    this.subnets = new Map();
    this.lock = new AsyncLock();
  }

  async add(cidr) {
    return this.lock.acquire('subnets', () => {
      if (this.subnets.has(cidr)) {
        throw new Error('subnet is in the list');
      }
      const block = new Netmask(cidr);
      this.subnets.set(cidr, block);
    });
  }

  async delete(cidr) {
    return this.lock.acquire('subnets', () => {
      if (!this.subnets.has(cidr)) {
        throw new Error('subnet is not in the list');
      }
      this.subnets.delete(cidr);
    });
  }

  async checkIp(ip) {
    return this.lock.acquire('subnets', () => {
      for (let block of this.subnets.values()) {
        if (block.contains(ip)) {
          return true;
        }
      }
      return false;
    });
  }
}

module.exports = Subnets;
