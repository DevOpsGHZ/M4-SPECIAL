var http      = require('http');
var httpProxy = require('http-proxy');
var redis = require('redis')
var exec = require('child_process').exec;
var request = require("request");
var os = require("os");
var nodemailer = require('nodemailer');
// var client = redis.createClient(6379, '52.90.214.22', {})
var instance1 = 'http://52.90.210.144:3000';
var instance2  = 'http://52.91.7.92:3000';
var client = redis.createClient(process.env.REDIS_PORT_6379_TCP_PORT,process.env.REDIS_PORT_6379_TCP_ADDR, {})
// var instance1 = 'http://' + process.env.PRODUCTION_PORT_3000_TCP_ADDR + ':' + process.env.PRODUCTION_PORT_3000_TCP_PORT;
// var instance2 = 'http://' + process.env.STAGING_PORT_3000_TCP_ADDR + ':' + process.env.STAGING_PORT_3000_TCP_PORT;
// var TARGET = BLUE;
var io;

var appNode;

/// CHILDREN nodes
var nodeServers = [];
// nodeServers.push( { 'addr': process.env.PRODUCTION_PORT_3000_TCP_ADDR, 'port': process.env.PRODUCTION_PORT_3000_TCP_PORT, 'latency': 0 } );
// nodeServers.push( { 'addr': process.env.STAGING_PORT_3000_TCP_ADDR, 'port': process.env.STAGING_PORT_3000_TCP_PORT, 'latency': 0 } );

var infrastructure =
{
  setup: function()
  {
    // Proxy.
//    client.lpush('servers', instance1);
//    client.lpush('servers', instance2);
//    client.ltrim('servers', 0, 1);
    appNode = {'addr': 'localhost', 'port': 3000, 'latency': 0 };
    nodeServers.push( appNode );
nodeServers.push( { 'addr': 'localhost', 'port': 3030, 'latency': 0 } );
nodeServers.push( { 'addr': 'localhost', 'port': 3060, 'latency': 0 } );



    client.set("percent", 0.8);
    var options = {};
    var proxy   = httpProxy.createProxyServer(options);

    var server  = http.createServer(function(req, res)
    {
      
      client.rpoplpush('servers', 'servers', function (err, reply){
        if(reply != 0){
          proxy.web( req, res, {target: "http://" + reply +":3000"} );    
        }
        
      });
      
      // res.send("haha");
      // console.log(res);
    });


    // Launch green slice
    exec('cd www; http-server -p 8080', function(err, out, code) 
     {
       console.log("attempting to launch monitor");
       if (err instanceof Error)
             throw err;
       if( err )
       {
         console.error( err );
       }
     });

    server.listen(3000);
    io = require('socket.io').listen(server);

  },

  teardown: function()
  {
    exec('forever stopall', function()
    {
      console.log("infrastructure shutdown");
      process.exit();
    });
  },
}

infrastructure.setup();

// Make sure to clean up.
process.on('exit', function(){infrastructure.teardown();} );
process.on('SIGINT', function(){infrastructure.teardown();} );
process.on('uncaughtException', function(err){
  console.error(err);
  infrastructure.teardown();} );


///////////////////////////////////////////////////////////////// monitor

function memoryLoad()
{
  // console.log("memoryLoad");
  var load = ~~ ( 100 * (os.totalmem() - os.freemem()) / os.totalmem());
  if(load > 90)
  {
    client.set("route", 1);
    // sendMail();
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
    // sendMail();
  }
  // if( usage <)

  return usage;
}

function measureLatenancy(addr, port)
{
  var node = {'addr': addr, 'port': port, 'latency': 0 };
  for(var i = 0; i < nodeServers.length; i++)
  {
    // if(nodeServers[i].addr == addr && nodeServers[i].port == port)
      node = nodeServers[i];
  }
  var options = 
  {
    url: 'http://' + addr + ":" + port,
  };

  var startTime = Date.now();
  // var latency = -1;
  request(options, function (error, res, body) 
  {
    node.latency = Date.now() - startTime;
    console.log(node.latency);
    // latency = node.latency;
  });
  if(node.latency > 400)
  {
    client.set("route", 1);
    // sendMail();
  }
  // console.log(latency);
  return node.latency;
}

function calcuateColor(latency)
{
  // latency scores of all nodes, mapped to colors.
    var color = "#cccccc";
    if( !latency )
      return [{color: color}];
    if( latency > 500 )
    {
      color = "#ff0000";
    }
    else if( latency > 400 )
    {
      color = "#cc0000";
    }
    else if( latency > 300 )
    {
      color = "#ffff00";
    }
    else if( latency > 200 )
    {
      color = "#cccc00";
    }
    else if( latency > 100 )
    {
      color = "#0000cc";
    }
    else
    {
      color = "#00ff00";
    }
    //console.log( latency );
    return [{color: color}];
}

///////////////
//// Broadcast heartbeat over websockets
//////////////
setInterval( function () 
{
  // for(var i = 0; i < nodeServers.length; i++)
  // {
  //     console.log(nodeServers[i].port);
  //     client.get( "server" + nodeServers[i].port, function(err,value){
  //       var info = value.split('#');
  //       var latency = measureLatenancy('localhost', info[0]);
  //       io.sockets.emit('heartbeat', 
  //       { 
  //         // name: "server" + nodeServers[i].port, cpu: cpuAverage(), memoryLoad: memoryLoad(), latency: measureLatenancy(appNode),
  //         name: "server" + info[0], cpu: info[1], memoryLoad: info[2], latency: latency,
  //         nodes: calcuateColor(latency)
  //       });
  //     });
  // }
  client.lrange('cpuload', 0, -1, function (err, reply){
    var total;
    for(var i = 0; i < reply.length; i++){
      total += parseInt(reply[i]);
    }
    var average = total / reply.length;
    if( average > 60){
      // client.set("")
      client.get("launch", function (err, reply){
        if(reply != "working"){
          //launch a new instance
          client.set("launch", "working");
          client.expire("launch", 1800);
          child = exec("sh ../launch_instance/launch.sh", function (error, stdout, stderr) {
                  // var config = require('./ip.json');
                  // console.log(config.ip);  
                  console.log('stdout: ' + stdout);
                  console.log('stderr: ' + stderr);
                  if (error !== null) {
                      console.log('exec error: ' + error);
                  }
          });
          
        }
      })
    }
  })


  client.rpoplpush('servers', 'servers', function (err, reply){
        // proxy.web( req, res, {target: reply } );  
        var server = reply;
        console.log(reply);
        if(reply != 0 && reply != null){
          client.get( server, function (err, value){
            console.log(value);
          var info = value.split('#');
          var latency = measureLatenancy(info[0], "3000")
          // console.log(latency);
          // var message = 
          io.sockets.emit('heartbeat', 
          { 
            // name: "server" + nodeServers[i].port, cpu: cpuAverage(), memoryLoad: memoryLoad(), latency: measureLatenancy(appNode),
            name: info[0] + ":3000", cpu: info[1], memoryLoad: info[2], latency: latency,
            nodes: calcuateColor(latency)
          });
        })
        }
        
  });


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
  nodeServers.push( appNode );
}

function sendMail()
{
    var transporter = nodemailer.createTransport();
    transporter.sendMail({
    from: 'automail@DevOpsGHZ.com',
    to: 'kgong@ncsu.edu',
    subject: 'abnomal behavior on sever',
    text: 'abnomal behavior on sever'
    });
}
