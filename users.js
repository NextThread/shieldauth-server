const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class User {
  constructor(login, password, name, phone, country, isAdmin = false, isBlocked = false) {
    this.login = login;
    this.password = password;
    this.name = name;
    this.phone = phone;
    this.country = country;
    this.isAdmin = isAdmin;
    this.isBlocked = isBlocked;
  }
}

class Users extends EventEmitter {
  constructor() {
    super();
    this.byLogin = new Map();
  }

  static load(filename) {
    const data = fs.readFileSync(filename, 'utf8');
    const users = new Users();

    JSON.parse(data).forEach(user => {
      if (!user.country) {
        throw new Error(`User missing country: ${JSON.stringify(user)}`);
      }
      users.byLogin.set(user.login, new User(
        user.login, 
        user.password, 
        user.name, 
        user.phone, 
        user.country, 
        user.isAdmin
      ));
    });

    return users;
  }

  get(login) {
    return this.byLogin.get(login);
  }

  register(user) {
    if (this.byLogin.has(user.login)) {
      throw new Error('User exists');
    }

    this.byLogin.set(user.login, user);
  }

  edit(login, { password, name, phone, country }) {
    const user = this.byLogin.get(login);

    if (!user) {
      throw new Error('Not found');
    }

    if (password !== undefined) user.password = password;
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (country !== undefined) user.country = country;
  }

  block(login) {
    const user = this.byLogin.get(login);

    if (!user) {
      throw new Error('Not found');
    }

    if (user.isBlocked) {
      throw new Error('Already blocked');
    }

    user.isBlocked = true;
  }

  unblock(login) {
    const user = this.byLogin.get(login);

    if (!user || !user.isBlocked) {
      throw new Error('Not found');
    }

    user.isBlocked = false;
  }
}

module.exports = { User, Users };
