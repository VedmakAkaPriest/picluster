const router = require('koa-router')();
const koaBody = require('koa-body');

const Koa = require('koa');
const app = module.exports = new Koa();

// Configs

app.context.API = require('./docker-api')(app);

// x-response-time

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});

// logger

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}`);
});


// route definitions

router.get('/handshake', async ctx => {
  const instanceId = `${ctx.query.project}`;
  const isForced = !!ctx.query.forced;
  const branchName = ctx.query.branch;

  if (!isForced) {
    // is it already running?
    const {running, available, configs} = await ctx.API.containers(ctx);
    console.log("running = ", running);
    if (running.indexOf(instanceId) > -1) {
      ctx.body = configs[instanceId];
      return;
    }

    // could we start existing?
    console.log("existing = ", available);
    if (Object.keys(available).indexOf(instanceId) > -1) {
      ctx.body = await ctx.API.start(ctx, instanceId);
      return;
    }
  }

  // should we create an image?
  const availableImages = await ctx.API.images(ctx);
  console.log("build = ", availableImages, isForced);
  if (isForced || availableImages.indexOf(ctx.query.project) === -1) {
    await ctx.API.build(ctx, ctx.query.project);
  }

  // add container
  console.log("addContainer = ", instanceId);
  await ctx.API.addContainer(ctx, instanceId, branchName ? `-e BRANCH=${branchName}` : undefined);

  // and try to start again
  ctx.body = await ctx.API.start(ctx, instanceId);


});

router.get('/branches', async ctx => {
  const instanceId = `${ctx.query.project}`;
  const url = await ctx.API.addFunction(ctx, instanceId, '-e CMD=branches');
  ctx.body = {url};
  ctx.status = 200;
});

router.get('/switch', async ctx => {
  const instanceId = `${ctx.query.project}`;
  const branch = ctx.query.branch;
  const url = await ctx.API.addFunction(ctx, instanceId, '-e CMD=switch -e BRANCH=' + branch);
  ctx.body = {url};
  ctx.status = 200;
});

app.use(router.routes());

app.listen(8000, function () {
  console.log('Listening on port 8000');
});
