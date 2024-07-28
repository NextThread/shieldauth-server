const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Address4, Address6 } = require('ip6');

class Geo {
  constructor(basePath) {
    this.cityById = this.loadCities(path.join(basePath, 'GeoLite2-City-Locations-en.csv'));
    this.cityByIp = this.loadIp4(path.join(basePath, 'GeoLite2-City-Blocks-IPv4.csv'), this.cityById);
  }

  getCityByIp(ip) {
    return this.cityByIp.find(ip);
  }

  loadCities(filename) {
    console.time('Cities loaded');
    const cityById = {};

    fs.createReadStream(filename)
      .pipe(csv())
      .on('data', (row) => {
        const id = parseInt(row['geoname_id'], 10);
        cityById[id] = {
          id,
          country: row['country_name'],
          subDiv1: row['subdivision_1_name'],
          subDiv2: row['subdivision_2_name'],
          name: row['city_name'],
        };
      })
      .on('end', () => {
        console.timeEnd('Cities loaded');
      });

    return cityById;
  }

  loadIp4(filename, cityById) {
    console.time('Ip4 loaded');
    const tree = new Tree();

    fs.createReadStream(filename)
      .pipe(csv())
      .on('data', (row) => {
        const geoId = parseInt(row['geoname_id'], 10);

        if (!row['geoname_id'] || !geoId) {
          return;
        }

        const city = cityById[geoId];
        if (!city) {
          console.log(`Cannot find geo id ${geoId}`);
          return;
        }

        const cidr = row['network'];
        tree.insert(cidr, city);
      })
      .on('end', () => {
        console.timeEnd('Ip4 loaded');
      });

    return tree;
  }
}

class Tree {
  constructor() {
    this.root = {};
  }

  insert(cidr, city) {
    const address = new Address4(cidr);
    this._insert(this.root, address, 0, city);
  }

  _insert(node, address, bit, city) {
    if (bit >= address.bitLength) {
      node.city = city;
      return;
    }

    const bitValue = address.getBitsBase2(bit, bit + 1);
    if (!node[bitValue]) {
      node[bitValue] = {};
    }

    this._insert(node[bitValue], address, bit + 1, city);
  }

  find(ip) {
    const address = new Address4(ip);
    return this._find(this.root, address, 0);
  }

  _find(node, address, bit) {
    if (!node || bit >= address.bitLength) {
      return node ? node.city : null;
    }

    const bitValue = address.getBitsBase2(bit, bit + 1);
    return this._find(node[bitValue], address, bit + 1);
  }
}

module.exports = Geo;
