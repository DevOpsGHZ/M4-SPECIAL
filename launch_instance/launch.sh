#!/bin/bash

nodejs launch_instance.js
sleep 60
ansible-playbook -i inventory provision.yml
ansible-playbook -i inventory production.yml
