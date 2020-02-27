# Personal Visit

## Frontend
Node and npm should be installed and be present in $PATH.

The following sequence of commands will install project's dependencies, build production bundle and place it into
src_python3/templates: 
```bash
$ cd frontend
$ npm install
$ npm run build --prod="true"
```
## Backend
To simplify the setup use pipenv installed globally (depending on your OS), otherwise use python 3 venv:
```bash
$ cd src_python3
$ pipenv install
```

To run the App activate virtual environment and use the following:
```bash
$ chmod +x ./bootstrap.sh
$ ./bootstrap.sh
```

Navigate to url shown in terminal.