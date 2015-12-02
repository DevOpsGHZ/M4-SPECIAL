var StatusModel = function(clients) {
    var self = this;
    self.clients = ko.observableArray();

    self.addClient = function(client) {
        self.clients.push(
            new ClientModel(client)
        );
    };
 
    self.removeClient = function(client) {
        self.clients.remove(client);
    };
 
    self.updateClient = function(person) 
    {
        for(var i = 0 ; i < self.clients().length ; i++)
        {
            var koObj = self.clients()[i];
            //console.log( koObj.name() )
            if(self.clients()[i].name() === person.name)
            {
                koObj.cpu(person.cpu);
                koObj.memoryLoad(person.memoryLoad);
                koObj.latency(person.latency);
                koObj.nodes([]);
                for( var j = 0; j < person.nodes.length ; j++ )
                {
                    koObj.nodes.push( new NodeModel(person.nodes[j]) );
                }
                break;
            }
        }
    };

    // initialize first time.
    for( var i = 0; i < clients.length; i++)
    {
        self.addClient( clients[i] );
    }
};

var ClientModel = function(client)
{
    var self = this;
    self.cpu = ko.observable(client.cpu);
    self.memoryLoad = ko.observable(client.memoryLoad);
    self.latency = ko.observable(client.latency);
    self.name = ko.observable(client.name);
    self.nodes = ko.observableArray([]);

    // init
    for( var i = 0; i < client.nodes.length; i++ )
    {
        self.nodes.push( new NodeModel(client.nodes[i]) );
    }
}

var NodeModel = function(node) {
    var self = this;
    self.color = ko.observable(node.color);
};

var nodeServers = [3000, 3030, 3060];
var model = [];
for(var i = 0; i < nodeServers.length; i++)
{
    model.push({ 
        name: "server" + nodeServers[i], cpu: "0.00", memoryLoad: "0", latency: "0",
        nodes: 
        [
            {color:"#ab3fdd"},
        ]
    });
}


var viewModel = new StatusModel( model );


$(document).ready( function()
{
    ko.applyBindings(viewModel);
    $('#statusTable').DataTable( { "paging":   false, "info":     false });

    var socket = io.connect('http://localhost:3000');

    socket.on("heartbeat", function(client) 
    {
        console.log(JSON.stringify(client));
        viewModel.updateClient( 
        {
            name:client.name, 
            cpu:client.cpu, 
            memoryLoad: client.memoryLoad,
            latency: client.latency,
            nodes:client.nodes 
        });
    });
}); 
