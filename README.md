#M4 SPECIAL - Gift Monkey & Doctor Monkey

##Gift Monkey
* When average cpu usage of servers > 70%, launch a new server instance
* Add the new server instance to server list stored in redis
* Automatically add routes to new server

## Doctor Monkey
* When cpu usage of a single server > 90%, reboot it
* Before rebooting, the server is removed from the server list and corresponding routing is deleted
* After rebooting, add the server to server list and proxy server rebuild the routing
