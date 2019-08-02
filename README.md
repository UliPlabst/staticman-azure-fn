# Staticman comment functionality deployed as an Azure Function
This repository is a clone of the [staticman](https://github.com/eduardoboucas/staticman) repository with some minor adjustments to make it run as an azure function without the express server. 
For maintenance purposes and because lazy I did not remove the unnecessary dependencies and logic that staticman has, as this repository **ONLY PROVIDES THE PULL REQUEST CREATION FUNCTIONALITY (and captcha validation)** nothing else. If you encounter performance issues and would like to remove the unnecessary stuff, feel free to send a pull request.
# How to set up
- set up a new azure function javascript or typescript project with *az cli* or [vscode azure function extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions). In the following **functionname**  will be the name you used as function name (not to be confused with **function-app-name**).
- in the project folder under *./functionname/* create an **src** folder and a file **index.[js|ts]** in it.
- create the application in *./functionname/src/index.[js|ts]*, e.g. for typescript
```ts
import { handler } from "staticman-azure-fn"

const handleRequest = async function (context, req): Promise<void> {
  let res = await handler(context, req, {
    branch: "mybranch",
    repository: "myrepo",
    service: "github",
    username: "myuser",
    version: "3",
    property: "comments"
  });
  context.res = res;
};

export default handleRequest;
```
Consider that my response binding in *./functionname/function.json* has **name: "res"**.
The parameters that you pass to *handler* are the query parameters that you would pass to staticman. 
Please refer to the [staticman doc](https://staticman.net/) for more information about that.
- run `npm i --save staticman-azure-fn` and `npm i --save-dev webpack` and if you use typescript `npm i --save-dev  ts-loader typescript`
- create a webpack config (staticman will run MUCH MUCH MUCH faster when the azure function does not have to load a whole node_module tree). Therefore we bundle the app. My webpack config looks like
```js
'use strict';

const path = require('path');

const config = {
  target: 'node',
  entry: './functionname/src/index.ts', 
  output: {
    path: path.resolve(__dirname, "functionname"),
    filename: 'index.js',
    libraryTarget: 'commonjs2',
  },
  devtool: 'source-map',
  externals: {
  },
  resolve: {
    extensions: [".ts", '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  }
};
module.exports = config;
```
If you use javascript, you can delete *config.module.rules[0]* and *config.resolve.extensions[0]*. Make sure to insert your functionname.
- now run `webpack`, it will bundle your app to *./functionname/index.js*. It will print a warning about yargs-parser (*the request of a dependency is an expression*). This is a non issue.
- create a *./config.[development|production].json* which resembles the staticman config. Depending on the value of the environment variable **NODE_ENV = "development"|"production"** staticman will use the appropriate config. I recommend that for production you should use the environment variables **RSA_PRIVATE_KEY** and **[GITLAB|GITHUB]_TOKEN** instead of putting these values in the config as you don't want to commit them. Refer to the staticman doc for more information. You can set environment variables in azure portal *Home > Function App > function-app-name > Platform Features > Configuration*. The **[GITLAB|GITHUB]_TOKEN** is the access token to a dummy gitlab/github account that performs the pull request. You can generate an **RSA_PRIVATE_KEY** with `openssl genrsa -out key.pem`.
- Create an azure function in the azure portal. I recommend (01/08/2019) that you use a windows azure function, as the linux one does not support CORS which you most likely need if you use staticman for a website. Therfore linux vms, although faster, are useless right now.
- Set the appropriate environment variables (including **NODE_ENV** and **PORT**) in the azure function portal for your azure function (*Home > Function App > function-app-name > Configuration*)
- Don't forget to configure a quota limit for your function if necessary. Also you can set your **function.json > authLevel** to "function" and use the function key (retrieved from azure portal) to prevent people without the key to call your function. You have to make the key public in your app though, so that's just a weak (but maybe effective) protection. 
- Configure CORS in azure portal *Home > Function App > function app name > Platform Features > CORS* and include your domain name (and localhost maybe for testing).
- Create a **./.funcignore** file that excludes everything but the necessary stuff. Mine is
```
*.js.map
*.ts
.git*
.vscode
local.settings.json
test
tsconfig.json
config.development.json
node_modules
*.js
!functionname/index.js
```
Note that the last line explicitely includes the bundled *index.js* that webpack creates.

- Deploy your function using az cli or the extension.
- Now you need the repository for which staticman should generate pull requests (e.g. github-pages repository). Set it up and create an appropriate **staticman.yml** according to the [staticman doc](https://staticman.net/docs/configuration) or look at a sample config.
- You can test your function with postman by making a request to **function-app-name.azurewebsites.net/api/functionname** with, for example a your appropriate payload that you specified in **staticman.yml**. Note that if you made your **function.json > authLevel** to "function", you need to send an additional HTTP Header **x-functions-key = YOUR_SECRET_FUNCTIONKEY**.

# TODO
Would probably be better to not clone the staticman source but to use the npm package. Might do this if I need the maintenance benefit.
