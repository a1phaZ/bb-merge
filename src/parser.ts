import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { InputConfig } from './types';

export function parseYamlFile(filePath: string): InputConfig {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const config = yaml.load(content) as InputConfig;

  return config;
}

export function parseYamlString(content: string): InputConfig {
  const config = yaml.load(content) as InputConfig;
  return config;
}
