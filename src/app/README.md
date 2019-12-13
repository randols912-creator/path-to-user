P2U - Geni Path 2 User
=======

Geni application that explores the path to user functionality of the Geni API.  Allows users to find:

	* Path to a specific account
	* Path from an account to another account
	* Path to US Presidents
	* Path to World Monarchs
	* Path to selected Geni projects (Nobel Prize winners, Olympians, British Monarchs, etc)
	* Path to Geni project by project id - limited to first 200 

Stack : Flask, Oauth2, MySql


*Not associated with Geni.com


How to run:
## 1. Run RQ worker
> rqworker p2u_high p2u_default

## 2. Run P2U
> python p2u.py

## 3. Goto http://localhost:5050
