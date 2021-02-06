/// <reference types="node" />
import { Transform } from "stream";
/**
  Creates a transform stream which splits / combines the buffer chunks to single messages.
*/
export declare function createSplitter(): Transform;
