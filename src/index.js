require('dotenv').config();

const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const vhost = require('vhost');
const passport = require('passport');
const { ExtractJwt, Strategy } = require('passport-jwt');
const mysql = require('mysql2/promise');
const { mysqlServer } = require('./connection');

// passport.use(
//   new Strategy(
//     {
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//       secretOrKey: process.env.HMAC_JWT,
//     },
//     async (payload, done) => {
//       if (payload.id) {
//         const sql = `SELECT *
//         FROM users
//         WHERE id=?;`;
//         const conn = await mysql.createConnection(mysqlServer);
//         const results = await conn.query(sql, [payload.id]);
//         conn.end();

//         return done(null, results[0]);
//       }

//       return done(false);
//     }
//   )
// );

// redirect http->https
const redirectController = (req, res, next) => {
  try {
    if (!req.secure && process.env.NODE_ENV === 'production') {
      res.redirect(302, `https://` + req.hostname + req.url);
    } else {
      next();
    }
  } catch (error) {
    console.log('An error has occurred: ', error);
    next(error);
  }
};

// www server app
var www = express();
const api = require('./refuge-front/routes');

www.use(redirectController, express.static(path.join(__dirname, 'refuge-front/dist')));

www.use('/register', async (req, res) => {
  res.sendFile(__dirname + '/refuge-front/dist/index.html');
});
www.use('/payment', async (req, res) => {
  res.sendFile(__dirname + '/refuge-front/dist/index.html');
});
www.use('/confirm', async (req, res) => {
  res.sendFile(__dirname + '/refuge-front/dist/index.html');
});
www.use('/hostess', async (req, res) => {
  res.sendFile(__dirname + '/refuge-front/dist/index.html');
});
www.use('/refuge-front', api);

// admin app
// const admin = express();
// const adminAuthApi = require('./admin-api/auth');
// const adminApi = require('./admin-api/routes');

// admin.use(express.static(path.join(__dirname, 'admin-front')));
// admin.use('/reservations', async (req, res) => {
//   res.sendFile(__dirname + '/admin-front/index.html');
// });
// admin.use('/waitlist', async (req, res) => {
//   res.sendFile(__dirname + '/admin-front/index.html');
// });
// admin.use('/openseats', async (req, res) => {
//   res.sendFile(__dirname + '/admin-front/index.html');
// });
// admin.use('/login', async (req, res) => {
//   res.sendFile(__dirname + '/admin-front/index.html');
// });

// admin.use('/admin-api', adminAuthApi);
// admin.use(
//   '/admin-api',
//   passport.authenticate('jwt', { session: false }),
//   adminApi
// );

// app
const app = express();
app.use(cors());
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 10000,
  })
);
app.use(bodyParser.json());

// certbot use
// app.use(
//   '/.well-known/acme-challenge/mx3xBKeBOAsJ22a5r7BA7n2CG0AuYoU2x9-e1kggOQg',
//   (req, res) => {
//     res.send(
//       'mx3xBKeBOAsJ22a5r7BA7n2CG0AuYoU2x9-e1kggOQg.52TkN6iN311BK18BHHox28yZwvqYPuANVE06tfxlasc'
//     );
//   }
// );

// development cant use ssl, so all possible routes are maped to the main server
if (process.env.NODE_ENV === 'development') {
  app.use(www);
  // app.use(admin);

  // Starting both http & https servers
  const httpServer = http.createServer(app);
  const port = process.env.SERVER_PORT || 80;
  httpServer.listen(port, () => {
    console.log(`HTTP Server running on port ${port}`);
  });
}

// ssl: https://itnext.io/node-express-letsencrypt-generate-a-free-ssl-certificate-and-run-an-https-server-in-5-minutes-a730fbe528ca
if (process.env.NODE_ENV === 'production') {
  // Vhost app

  app.use(vhost('www.refugeball.com', www));
  //app.use(vhost('admin.refugeball.com', admin));
  app.use(vhost('refugeball.com', www));

  // Starting both http & https servers
  const httpServer = http.createServer(app);
  const port = process.env.SERVER_PORT || 80;
  httpServer.listen(port, () => {
    console.log(`HTTP Server running on port ${port}`);
  });

  // refugeball.com cert
  const privateKey = fs.readFileSync(
    '/etc/letsencrypt/live/refugeball.com/privkey.pem',
    'utf8'
  );
  const certificate = fs.readFileSync(
    '/etc/letsencrypt/live/refugeball.com/cert.pem',
    'utf8'
  );
  const ca = fs.readFileSync(
    '/etc/letsencrypt/live/refugeball.com/chain.pem',
    'utf8'
  );

  const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca,
  };

  // *.refugeball.com cert
  // const privateKey2 = fs.readFileSync(
  //   '/etc/letsencrypt/live/refugeball.com/privkey.pem',
  //   'utf8'
  // );
  // const certificate2 = fs.readFileSync(
  //   '/etc/letsencrypt/live/refugeball.com/cert.pem',
  //   'utf8'
  // );
  // const ca2 = fs.readFileSync(
  //   '/etc/letsencrypt/live/refugeball.com/chain.pem',
  //   'utf8'
  // );

  // const credentials2 = {
  //   key: privateKey2,
  //   cert: certificate2,
  //   ca: ca2,
  // };

  const httpsServer = https.createServer(credentials, app);
  // httpsServer.addContext('www.refugeball.com', credentials2);
  // httpsServer.addContext('admin.refugeball.com', credentials2);

  httpsServer.listen(443, () => {
    console.log('HTTPS Server running on port 443');
  });
}
