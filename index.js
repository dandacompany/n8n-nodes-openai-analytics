"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.credentialTypes = exports.nodeTypes = void 0;
var OpenAIAssistants_node_1 = require("./dist/nodes/OpenAIAssistants/OpenAIAssistants.node");
var OpenAIAssistantsApi_credentials_1 = require("./dist/credentials/OpenAIAssistantsApi.credentials");
// Export the nodes classes 
exports.nodeTypes = [
    new OpenAIAssistants_node_1.OpenAIAssistants(),
];
// Export the credentials
exports.credentialTypes = [
    new OpenAIAssistantsApi_credentials_1.OpenAIAssistantsApi(),
]; 