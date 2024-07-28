const ip6 = require('ip6');

class Node {
  constructor() {
    this.left = null;
    this.right = null;
    this.city = null;
  }
}

class Tree {
  constructor() {
    this.root = new Node();
  }

  insert(cidr, city) {
    let count = 0;
    const [ip, mask] = cidr.split('/');
    const maskOnes = parseInt(mask, 10);

    let root = this.root;
    const ipBytes = ip6.toBuffer(ip);

    for (const byte of ipBytes) {
      for (let i = 7; i >= 0; i--) {
        if ((byte >> i) & 1) {
          if (!root.right) {
            root.right = new Node();
          }
          root = root.right;
        } else {
          if (!root.left) {
            root.left = new Node();
          }
          root = root.left;
        }
        count++;
        if (count === maskOnes) {
          root.city = city;
          return;
        }
      }
    }
  }

  find(ip) {
    let root = this.root;
    const ipBytes = ip6.toBuffer(ip);
    let res = null;

    for (const byte of ipBytes) {
      for (let i = 7; i >= 0; i--) {
        if ((byte >> i) & 1) {
          if (!root.right) {
            return res;
          }
          root = root.right;
        } else {
          if (!root.left) {
            return res;
          }
          root = root.left;
        }
        if (root.city) {
          res = root.city;
        }
      }
    }

    return res;
  }
}

module.exports = Tree;
