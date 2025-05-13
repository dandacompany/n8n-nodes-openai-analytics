"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.credentialTypes = exports.nodeTypes = void 0;
var OpenAIAnalytics_node_1 = require("./dist/nodes/OpenAIAnalytics/OpenAIAnalytics.node");
var OpenAIAnalyticsApi_credentials_1 = require("./dist/credentials/OpenAIAnalyticsApi.credentials");
// Export the nodes classes 
exports.nodeTypes = [
    new OpenAIAnalytics_node_1.OpenAIAnalytics(),
];
// Export the credentials
exports.credentialTypes = [
    new OpenAIAnalyticsApi_credentials_1.OpenAIAnalyticsApi(),
]; 