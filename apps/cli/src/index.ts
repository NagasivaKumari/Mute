#!/usr/bin/env node
import { Command } from 'commander';
import {
  loginCommand,
  registerCommand,
  initCommand,
  protectCommand,
  runCommand,
  sessionStartCommand,
  sessionStopCommand,
  statusCommand,
  auditCommand,
  approveCommand,
  doctorCommand,
  policyListCommand,
} from './commands';

const program = new Command();

program
  .name('sentinel')
  .description('Sentinel Policy Mesh CLI')
  .version('1.0.0');

program
  .command('login')
  .description('Authenticate and store credentials locally')
  .option('--email <email>', 'Email address')
  .option('--password <password>', 'Password')
  .option('--api-url <url>', 'API URL')
  .action(async (opts) => {
    await loginCommand(opts);
  });

program
  .command('register')
  .description('Create a new account and log in')
  .option('--email <email>', 'Email address')
  .option('--password <password>', 'Password')
  .option('--api-url <url>', 'API URL')
  .action(async (opts) => {
    await registerCommand(opts);
  });

program
  .command('init')
  .description('Initialize Sentinel in current project')
  .action(async () => {
    await initCommand();
  });

program
  .command('protect')
  .description('Scan and protect secrets with sentinel:// references')
  .action(async () => {
    await protectCommand();
  });

program
  .command('run <command>')
  .description('Run a command with secrets resolved from vault')
  .action(async (command: string) => {
    await runCommand(command);
  });

const session = program.command('session').description('Manage runtime sessions');

session
  .command('start')
  .description('Start a protected AI session')
  .action(async () => {
    await sessionStartCommand();
  });

session
  .command('stop')
  .description('End current session')
  .action(async () => {
    await sessionStopCommand();
  });

program
  .command('status')
  .description('Show runtime and session status')
  .action(async () => {
    await statusCommand();
  });

program
  .command('audit')
  .description('Show recent audit entries')
  .action(async () => {
    await auditCommand();
  });

program
  .command('approve <id>')
  .description('Approve a pending request')
  .action(async (id: string) => {
    await approveCommand(id);
  });

program
  .command('doctor')
  .description('Health check (API, runtime, Flare)')
  .action(async () => {
    await doctorCommand();
  });

program
  .command('policy-list')
  .description('List active policies')
  .action(async () => {
    await policyListCommand();
  });

program.parse();
