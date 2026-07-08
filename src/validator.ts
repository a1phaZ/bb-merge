import * as Joi from 'joi';
import { InputConfig } from './types';

const schema = Joi.object({
  project: Joi.string().required().messages({
    'any.required': 'Project is required',
    'string.empty': 'Project cannot be empty'
  }),
  repo: Joi.string().required().messages({
    'any.required': 'Repository is required',
    'string.empty': 'Repository cannot be empty'
  }),
  target: Joi.string().required().messages({
    'any.required': 'Target branch is required',
    'string.empty': 'Target branch cannot be empty'
  }),
  branches: Joi.array().items(Joi.string()).min(1).required().messages({
    'any.required': 'Branches list is required',
    'array.min': 'At least one branch is required'
  }),
  pr: Joi.object({
    title_prefix: Joi.string().default('Merge'),
    description: Joi.string().default('')
  }).default(),
  webhook: Joi.object({
    url: Joi.string().uri().required(),
    events: Joi.array().items(Joi.string()).default(['pr:merged', 'pr:updated'])
  }).optional()
});

export function validateConfig(config: InputConfig): { valid: boolean; error?: string } {
  const { error } = schema.validate(config, { abortEarly: false });

  if (error) {
    const messages = error.details.map(d => d.message).join('\n');
    return { valid: false, error: messages };
  }

  return { valid: true };
}
