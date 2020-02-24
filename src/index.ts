import Staticman from "./lib/Staticman";
import { checkRecaptcha } from "./controllers/process"

interface IHandlerParams {
  branch: string;
  repository: string;
  service: "gitlab"|"github";
  username: string;
  version: "1"|"2"|"3";
  property: string;
}

interface IResponse {
  status: number;
  body: {
    success: boolean;
    error?: any;
    data?: any;
  };
  headers: any;
}

function errorResponse(status, error): IResponse
{
  return {
    status: status,
    body: {
      success: false,
      error: error
    },
    headers: {
      'Content-Type': 'application/json'
    }
  }
}

export async function handler(context, req, params: IHandlerParams): Promise<IResponse> {
  try
  {
    if(!req.body)
    {
      return errorResponse(400, "No body")
    }

    const staticman = new Staticman(params);
    staticman.setConfigPath();
    (req as any).connection = {                   //staticman wants to have this connection property, I will give it to him
      remoteAddress: req.headers["client-ip"]
    };
    staticman.setIp(req.headers['x-forwarded-for'] || (req as any).connection.remoteAddress);
    staticman.setUserAgent(req.headers['user-agent']);

    try
    {
      let captchaValid = await checkRecaptcha(staticman, req) //captchaValid returns false if not configured, throws if captcha is invalid
    }
    catch(error)
    {
      return errorResponse(403, `invalid-captcha, reason: ${error.message}`)
    }
    
    let fields  = req.body.fields
    let options = req.body.options

    let data = await staticman.processEntry(fields, options)
    return {
      status: 200,
      body: {
        success: true,
        data: data
      },
      headers: {
        "Content-Type": "application/json",
      }
    }
  }
  catch(error)
  { 
    context.log(error.stack || error);
    return errorResponse(500, error)
  }
};