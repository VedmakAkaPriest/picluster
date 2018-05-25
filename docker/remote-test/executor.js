const { exec, spawn } = require('./child-process-async');
const gitP = require('simple-git/promise');
const fetch = require('node-fetch');

const localPath = __dirname + '/sources';
const USER = 'user';
const PASS = 'pass';
const REPO = 'gitlab.com/yourrepo/RemoteTest.git';
const remote = `https://${USER}:${PASS}@${REPO}`;
const git = gitP(localPath);



function pull() {
  const branchName = process.env.BRANCH || 'master';

  return git.checkIsRepo()
    .then(isRepo => !isRepo && git.clone(remote, localPath))
    .then(() => git.checkout(branchName))
    .then(() => git.pull());
}

function installDeps() {
  const yarn = spawn('yarn', ['install'], {cwd: localPath});

  yarn.stdout.on('data', function (data) {
    console.log('stdout: ' + data);
  });

  yarn.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
  });

  yarn.on('exit', function (code) {
    console.log('child process exited with code ' + code);
  });

  return yarn;
}

function packager() {
  const packager = spawn('yarn', ['start', '--port', '8082'], {cwd: localPath});

  packager.stdout.pipe(process.stdout);
  packager.stderr.pipe(process.stderr);

  packager.on('exit', function (code) {
    console.log('child process exited with code ' + code);
  });

  return packager;
}

async function executor(command) {
  switch (command) {
    case 'clone':
    {
      await git.clone(remote, localPath).then(() => git.pull());
    }
      break;

    case 'start':
    {
      await pull().then(installDeps).then(packager);
    }
      break;

    case 'branches':
    { // http://192.168.2.137:3003/function?token=1234567890ABCDEFGHJKLMNOP&function=remote-test&container_args=-e%20CMD=branches
      // http://192.168.2.137:3000/getfunction?token=1234567890ABCDEFGHJKLMNOP&uuid=2847911
      const server = process.env.SERVER;
      const token = process.env.TOKEN;
      const uuid = process.env.UUID;

      await git.fetch();
      const summary = await git.branch(['-a', '-v', '--list']);
      const body = JSON.stringify({
        token,
        output: JSON.stringify(summary),
        uuid,
      });

      fetch(server + '/function', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body,
        }
      ).catch(error => console.log('An error has occurred.' + error));
    }
      break;

    case 'switch':
    {
      const server = process.env.SERVER;
      const token = process.env.TOKEN;
      const uuid = process.env.UUID;
      const branchName = process.env.BRANCH || 'master';

      await git.checkout(branchName);

      const body = JSON.stringify({
        token,
        output: JSON.stringify({status: 'done', branch: branchName}),
        uuid,
      });

      fetch(server + '/function', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body,
        }
      ).catch(error => console.log('An error has occurred.' + error));
    }
  }
}

console.log("process.env.CMD = ", process.env.CMD);
executor(process.env.CMD || 'start');
