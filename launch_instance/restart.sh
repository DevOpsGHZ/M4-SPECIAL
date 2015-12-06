echo "---------Get instance ID----------"
aws ec2 describe-instances > instances.json
id=$(nodejs restart.js $1) 
echo $id
echo "---------Reboot instance----------"
aws ec2 reboot-instances --instance-ids $id
sleep 120

echo "-------Start app in instance------"
echo "server ansible_ssh_host=$1 ansible_ssh_user=ubuntu ansible_ssh_private_key_file=private.key" > inventory
ansible-playbook -i inventory production.yml
