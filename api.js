const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const base64url = require('base64url');
const geo = require('./model/geo'); // 
const users = require('./model/users'); // 
const blacklist = require('./model/blacklist'); // 

const app = express();
app.use(bodyParser.json());

const secret = base64url.toBuffer('CGWpjarkRIXzCIIw5vXKc+uESy5ebrbOyVMZvftj19k=');

const mwCheckIP = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const isBlocked = blacklist.isBlockedIP(ip); 
  if (isBlocked) {
    return res.sendStatus(403);
  }
  next();
};

const mwAuth = (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, secret, (err, decoded) => {
    if (err) return res.sendStatus(403);
    req.user = decoded;
    next();
  });
};

app.post('/auth', mwCheckIP, async (req, res) => {
  const { login, password, nonce } = req.body;

  try {
    const user = await users.get(login);
    if (!user || user.password !== password || user.isBlocked) {
      return res.sendStatus(403);
    }

    const ipCity = await geo.getCityByIp(req.headers['x-forwarded-for']);
    if (ipCity && ipCity.country !== user.country) {
      return res.sendStatus(403);
    }

    const token = jwt.sign({ login: user.login, nonce }, secret, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put('/user', mwCheckIP, async (req, res) => {
  const { login, password, name, phone, country } = req.body;

  try {
    const ipCity = await geo.getCityByIp(req.headers['x-forwarded-for']);
    if (ipCity && ipCity.country !== country) {
      return res.sendStatus(403);
    }

    await users.register({ login, password, name, phone, country });
    res.sendStatus(201);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.patch('/user', mwCheckIP, mwAuth, async (req, res) => {
  const { password, name, phone, country } = req.body;

  try {
    await users.edit(req.user.login, { password, name, phone, country });
    res.sendStatus(202);
  } catch (err) {
    res.status(404).send(err.message);
  }
});

app.get('/user', mwCheckIP, mwAuth, async (req, res) => {
  try {
    const user = await users.get(req.user.login);
    if (!user) return res.sendStatus(404);

    const { login, name, phone, country, isAdmin } = user;
    res.status(200).json({ login, name, phone, country, isAdmin });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put('/blacklist/subnet/:ip/:mask', mwCheckIP, mwAuth, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);

  try {
    const { ip, mask } = req.params;
    await blacklist.addSubnet(`${ip}/${mask}`);
    res.sendStatus(201);
  } catch (err) {
    res.status(409).send(err.message);
  }
});

app.delete('/blacklist/subnet/:ip/:mask', mwCheckIP, mwAuth, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);

  try {
    const { ip, mask } = req.params;
    await blacklist.deleteSubnet(`${ip}/${mask}`);
    res.sendStatus(204);
  } catch (err) {
    res.status(404).send(err.message);
  }
});

app.put('/blacklist/user/:login', mwCheckIP, mwAuth, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);

  try {
    await users.block(req.params.login);
    res.sendStatus(201);
  } catch (err) {
    if (err.message === 'User not found') {
      res.sendStatus(404);
    } else if (err.message === 'User already blocked') {
      res.sendStatus(409);
    } else {
      res.status(500).send(err.message);
    }
  }
});

app.delete('/blacklist/user/:login', mwCheckIP, mwAuth, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);

  try {
    await users.unblock(req.params.login);
    res.sendStatus(204);
  } catch (err) {
    if (err.message === 'User not found') {
      res.sendStatus(404);
    } else {
      res.status(500).send(err.message);
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
