require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser')
// const dns = require('node:dns')
const dns = require('dns')
const { parse: urlParser } = require('url')
const mongoose = require('mongoose')

mongoose
	.connect(process.env.MONGO_URI, { useNewUrlParser: true })
	.then(() => {
		console.log('Database connection successful')
	})
	.catch(err => {
		console.error('Database connection error')
	})

const shortUrlSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true,
    required: true
  },
  url: {
    type: String,
    unique: true,
    required: true
  },
})

ShortUrl = mongoose.model('ShortUrl', shortUrlSchema)

const createAndSaveUrl = async (url) => {
  try {
    const shortUrl = await ShortUrl.findOne({ url: url })
    if (shortUrl) return shortUrl
    const count = await ShortUrl.countDocuments({})
    // console.log("Count:", count)
    const newShortUrl = new ShortUrl({
      id: count+1, url: url
    })
    const retUrl = await newShortUrl.save()
    return retUrl
  } catch (err) {
    console.error("Error in createAndSaveUrl:", err)
  }
}

const getUrlById = async (id) => {
  try {
    const shortUrl = await ShortUrl.find({ id: id })
    return shortUrl
  }
  catch (err) {
    return console.error(err)
  }
}

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
})

app.post('/api/shorturl/', (req, res) => {
  const { url: rawUrl } = req.body
  const parsedUrl = urlParser(rawUrl)
  const url = parsedUrl.protocol ? parsedUrl.host : parsedUrl.path
  // console.log("About to DNS lookup url:", url);
  dns.lookup(url,
    (err, address, family) => {
    if (err) {
      // console.log('err:', err)
      // console.log('address:', address)
      // console.log('family:', family)
      res.json({
        "error": "invalid url"
      })
    } else {
      createAndSaveUrl(url)
        .then(shortUrl => {
          // console.log("Returning from createAndSave with", shortUrl)
          res.json({
            "original_url": shortUrl.url,
            "short_url": shortUrl.id
          })
        })
        .catch(err => {
          res.json({
            error: 'invalid url',
          })
        })
    }})
})


app.get('/api/shorturl/:id', (req, res) => {
  const { id } = req.params
  if (isNaN(id)) {
    res.json({
      error: 'invalid url'
    })
  }
  getUrlById(+id)
    .then(shortUrl => {
      console.log('shortUrl', shortUrl)
      res.redirect(`https://${shortUrl[0].url}`)
    })
    .catch(err => {
      console.log("invalid url")
    })
})


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
})
