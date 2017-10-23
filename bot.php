<?php

$botToken = ""; //Bot TOKEN
$website = "https://api.telegram.org/bot" .$botToken;

$update = file_get_contents($website."/getupdates");

print_r($update);



>