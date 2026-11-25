import {createLogoServer} from './api.mjs';
const port=Number(process.env.PORT??8080);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid port');createLogoServer({token:process.env.XSUS_LOGO_SERVICE_TOKEN}).listen(port,'0.0.0.0');
