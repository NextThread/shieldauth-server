const express = require('express');
const jwt = require('jsonwebtoken');
const geoip = require('geoip-lite');
const { Netmask } = require('netmask');
const usersModule = require('./model/users');
const blacklistModule = require('./model/blacklist');

class Api {
  constructor(secret, users, geo, blSubnets) {
    this.secret = secret;
    this.users = users;
    this.geo = geo;
    this.blSubnets = blSubnets;
  }

  mwCheckIP(req, res, next) {
    const ip = req.headers['x-forwarded-for'];
    if (this.blSubnets.checkIp(ip)) {
      return res.sendStatus(403);
    }
    next();
  }

  mwAuth(handler) {
    return (req, res, next) => {
      const token = req.headers['x-api-key'];
      if (!token) {
        return res.sendStatus(403);
      }

      jwt.verify(token, this.secret, (err, decoded) => {
        if (err) {
          console.log(err);
          return res.sendStatus(403);
        }

        const user = this.users.get(decoded.login);
        if (!user || user.isBlocked) {
          return res.sendStatus(403);
        }

        const ip = req.headers['x-forwarded-for'];
        const geo = geoip.lookup(ip);
        if (geo && geo.country !== user.country) {
          return res.sendStatus(403);
        }

        req.user = user;
        handler(req, res, next);
      });
    };
  }

  mwCheckRegion(handler) {
    return (req, res, next) => {
      // Implement region check logic
      handler(req, res, next);
    };
  }
}

module.exports = Api;
