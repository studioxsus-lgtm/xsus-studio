import opentype from 'opentype.js';
import {createFontLibrary} from './font-library.mjs';
export function createRuntimeFontLibrary(options={}){return createFontLibrary({...options,parse:buffer=>opentype.parse(buffer)})}
