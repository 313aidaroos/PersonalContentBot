#!/usr/bin/env node

import fetch from "node-fetch";
import { readFileSync } from "fs";
import { join } from "path";

const projectId = "prj_DXhM7WBdFB5CAYTselm7sYp84wD6";
const token = process.env.VERCEL_TOKEN;

if (!token) {
  console.error("VERCEL_TOKEN not set");
  process.exit(1);
}

// Trigger a deployment by pushing a rebuild request
const response = await fetch(
  `https://api.vercel.com/v13/deployments?forceNew=1`,
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      gitSource: {
        type: "github",
        repo: "313aidaroos/PersonalContentBot",
        ref: "main",
      },
      projectId,
    }),
  }
);

const data = await response.json();
if (data.error) {
  console.error("Deployment error:", data.error);
  process.exit(1);
}

console.log(`Deployment triggered: ${data.url}`);
console.log(`ID: ${data.id}`);
