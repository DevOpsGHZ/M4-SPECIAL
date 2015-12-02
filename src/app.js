var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');
var http      = require('http');
var httpProxy = require('http-proxy');
var exec = require('child_process').exec;
var request = require("request")
var os = require("os");

var url = "http://ipinfo.io"
var ipinfo = require('./ip.json');
var ip = ipinfo.ip;
console.log(ipinfo);
var app = express();
// console.log(process.env.REDIS_PORT_6379_TCP_ADDR + ':' + process.env.REDIS_PORT_6379_TCP_PORT);
var redis = require('redis')
var client = redis.createClient(process.env.REDIS_PORT_6379_TCP_PORT,process.env.REDIS_PORT_6379_TCP_ADDR, {})
// view engine setup
//var client = redis.createClient(6379, "redis", {})

// request({
//     url: "http://ipinfo.io",
//     json: true
// }, function (error, response, body) {

//     if (!error && response.statusCode === 200) {
//         console.log(body.ip) // Print the json response
//     }

// })


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);
//app.use('/manage', manage);
app.get('/set', function(req, res) {
  client.set("key", "This message will self-destruct in 10 seconds");
  client.expire("key",10);
  res.end();
})


app.get('/get', function(req, res) {
  client.get("key",function(err, reply) {
    // reply is null when the key is missing
    //console.log("Hello");
    if(reply == null)
    {
      res.send('There is no value for key');
    }
    else
    {
      res.send(reply);
    }
    });
})

app.get('/fon',function(req,res){
  client.set("featureFlag", "on");
  res.render('statuson', { title: 'Status' });
  res.end();
});
app.get('/foff',function(req,res){
  client.set("featureFlag", "off");
  res.render('statusoff', { title: 'Status' });
  res.end();
});
app.get('/fstatus',function(req,res){
  client.get("featureFlag",function(err, reply) {
    // reply is null when the key is missing
    //console.log("Hello");
    if(reply == null)
    {
      res.render('statusunknown', { title: 'Status' });
      res.end(); 
    }
    else if (reply=='on')
    {
      res.render('statuson', { title: 'Status' });
      res.end(); 
    }
    else
    {
      res.render('statusoff', { title: 'Status' });
      res.end();
    }
    });

});

app.get('/feature',function(req,res){
  client.get("featureFlag",function(err, reply) {
    // reply is null when the key is missing
    //console.log("Hello");
    if(reply == null)
    {
      res.render('statusunknown', { title: 'Status' });
      res.end(); 
    }
    else if (reply=='on')
    {
      res.render('feature', { title: 'Feature' });
      res.end(); 
    }
    else
    {
      res.render('unavailable', { title: 'Not available' });
      res.end();
    }

    });
});





// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});



// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;

var server = require('http').createServer(app);
server.listen(3000);

function memoryLoad()
{
  // console.log("memoryLoad");
  var load = ~~ ( 100 * (os.totalmem() - os.freemem()) / os.totalmem());
  if(load > 90)
  {
    client.set("route", 1);
    sendMail();
  }
  // if(load < 70)
  // {
  //   client.set("route", 1); 
  // }
  return load;
}

// Create function to get CPU information
function cpuTicksAcrossCores() 
{
  //Initialise sum of idle and time of cores and fetch CPU info
  var totalIdle = 0, totalTick = 0;
  var cpus = os.cpus();
 
  //Loop through CPU cores
  for(var i = 0, len = cpus.length; i < len; i++) 
  {
    //Select CPU core
    var cpu = cpus[i];
    //Total up the time in the cores tick
    for(type in cpu.times) 
    {
      totalTick += cpu.times[type];
    }     
    //Total up the idle time of the core
    totalIdle += cpu.times.idle;
  }
 
  //Return the average Idle and Tick times
  return {idle: totalIdle / cpus.length,  total: totalTick / cpus.length};
}

var startMeasure = cpuTicksAcrossCores();

function cpuAverage()
{
  var endMeasure = cpuTicksAcrossCores(); 
 
  //Calculate the difference in idle and total time between the measures
  var idleDifference = endMeasure.idle - startMeasure.idle;
  var totalDifference = endMeasure.total - startMeasure.total;
 
  //Calculate the average percentage CPU usage
  var usage = ~~ ( 100 * (totalDifference - idleDifference) / totalDifference );
  if(usage > 50)
  {
    client.set("route", 1);
    sendMail();
  }
  // if( usage <)

  return usage;
}

/// CHILDREN nodes
var nodeServers = [];
// nodeServers.push( { 'addr': process.env.PRODUCTION_PORT_3000_TCP_ADDR, 'port': process.env.PRODUCTION_PORT_3000_TCP_PORT, 'latency': 0 } );
// nodeServers.push( { 'addr': process.env.STAGING_PORT_3000_TCP_ADDR, 'port': process.env.STAGING_PORT_3000_TCP_PORT, 'latency': 0 } );

///////////////
//// Broadcast heartbeat over websockets
//////////////
setInterval( function () 
{
  var message = "3000" + "#" + cpuAverage() + "#" + memoryLoad();
  console.log(message);
  client.set( ip, message);
  
}, 2000);

// app.listen(3080);

/// NODE SERVERS

function createServer(port, fn)
{
  // Response to http requests.
  var server = http.createServer(function (req, res) {
      res.writeHead(200, { 'Content-Type': 'text/html' });

      fn();

      res.end();
   }).listen(port);
  nodeServers.push( app );
}

