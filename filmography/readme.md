# Filmography sample JET/OPT application

'Filmography' is a stand-alone OJET sample application that leverages JET UI components and OPT for offline persistence.

This folder contains the most recent sample code provided by Oracle along with a few bug fixes and config change to work against IL-DCEO servers.

## Required Setup

### Install 'Node'

It is necessary to install 'node' (node.js) to run and maintain the code for filmography as well as the utilities.  Once 'node'' (and NPM) are installed run the following on the command line to install a local http server that will be used to run/test/debug the application.

        npm install --global http-server

This installation will allow you to start a node based static web server server in the current directory, it is started from the command line with:

        http-server

### Setup Ap`p to use IL-DCEO server

A sandbox was created on the Dev1 instance that contains the data model necessary for this filmography sample code. The data model implmented in the sandbox is documented in [datamodel.md](datamodel.md)

The code had already been configured to use the IL-DCEO dev server. But a few more steps are necessary to run the code against the dev server.  

1. Choose Credentials
    First choose the credentials to be used for both the sandbox and teh REST API calls.
2. Enter the 'filmography sandbox'
    * With the chosen credentials, login to the [Dev1](https://fa-eucx-dev1-saasfaprod1.fa.ocs.oraclecloud.com/fscmUI) Fusion Sales/Service instance.
    * Enter the *NS_FILMOGRAPHY_DEV* sandbox containing Custom Objects supporting this demo app.
3. Configure API credentials
    * Edit the user credentials veriables (apiUser & apiPass) in the file js/fuseConfig.js
    * If also using the node utilities under nodejs configure credentials in nodejs/wx-films-delete/app.js and nodejs/wxfilms-load/index.js

## Running and Debugging the application

The application mostly works when loading index.html through a file URL. However, there are some issues if you don't load the application through a wb server. That is why it was recommended to install the node module http-server.

You can start the server from the a shell (other than Powershell) using the command: _http-server_. It is important is executed from within the filmography directory so it becomes the 'root' for the web server.  When you run that command it will report the IP addresses and ports that the server is listening on. The default port for http-server is 8080.

You can load the app in a web browser with <http://localhost:8080/> or one of the other URLs listed by http-server.

You will be able to view the JavaScript console in the Chrome (or other browser) debug tools.

I use the Visual Studio Code debugger attached to Chrome which is very useful for setting breakpoints, visualizing variables and more.  If anyone needs help seting that up, I'll be happy to help.

## Controlling the online/offline status of application

I usually disable network on the Network tab in the Chrome Debug Tools. But we saw Robert disabling it from the Application tab under 'Service Workers' checking the box 'offline'. I don't know if it makes a difference, but I would recommend following the approach Robert used.
