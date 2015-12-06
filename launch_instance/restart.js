var AWS = require('aws-sdk');
var uuid = require('node-uuid');
var fs = require('fs');

var exec = require('child_process').exec;
var child;
// executes `pwd`
var args = process.argv.slice(2);

var instanceParams = {
  	       region: 'us-east-1',
 	         apiVersion : 'latest',
 	         maxRetries : 20
}
// var ip = "52.90.185.5";

var ec2 = new AWS.EC2(instanceParams);

var instances = require("./instances.json")
// console.log(instances.Reservations);

for(var i = 0; i < instances.Reservations.length; i++){
	// console.log(instances.Reservations[i].Instances[0]);
	if( instances.Reservations[i].Instances[0].PublicIpAddress == args[0])
	{
		console.log(instances.Reservations[i].Instances[0].InstanceId);
		var id = instances.Reservations[i].Instances[0].InstanceId;
		var params = {
  				InstanceIds: [ id ],
				DryRun: false
					};
		ec2.rebootInstances(params, function(err, data) {
  			// if (err) console.log(err, err.stack); // an error occurred
  			// else     console.log(data);           // successful response
			});
	}
}
