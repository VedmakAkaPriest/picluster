const fs = require('fs');
const _ = require('lodash');
const koaRequest = require('koa-http-request');

const SERVER = process.env.SERVER || 'http://localhost:3000';
const uuid = process.env.UUID || 'UUID1234';
const token = process.env.TOKEN || '1234567890ABCDEFGHJKLMNOP';

// actions

const nodes = async (ctx) => await ctx.get('/nodes', {token}).then(res => JSON.parse(res));
const images = async (ctx) => {
  const nodesInfo = await nodes(ctx);
  return _(nodesInfo.data).map((node) => node.images).flatten().uniq().value();
};
const containers = async (ctx) => {
  const nodesInfo = await nodes(ctx);

  let configs = {};
  const running = _(nodesInfo.data).map((node) => {
    Object.assign(configs, node.config);
    return node.running_containers;
  }).flatten().uniq().value();
  const available = _.reduce(nodesInfo.container_list, (accum, c) => {
    accum[c] = configs[c];
    return accum;
  }, {});

  return {running, available, configs};
};
const build = (ctx, image, no_cache = false) => ctx.get('/build', {
  token, image, no_cache,
});
const start = (ctx, container) => ctx.get('/start', {token, container}).then(res => JSON.parse(res));
const addContainer = (ctx, container, container_args='', host='*') => {
  let args = [`-p 8082:8082 --mount source=${container}-vol,target=/app/sources`, container_args];
  ctx.get('/addcontainer', {token, container, container_args: args.join(' '), host});
};
const addFunction = (ctx, container, container_args='', host='*') => {
  let args = [`--mount source=${container}-vol,target=/app/sources`, container_args];
  return ctx.get('/function', {token, 'function': container, container_args: args.join(' '), host});
};

// wire it up

module.exports = app => {
  app.use(koaRequest({
    json: false,        // automatically parsing of JSON response
    timeout: 30000,     // 30s timeout
    host: SERVER,
  }));

  return {
    nodes,
    images,
    containers,
    build,
    start,
    addContainer,
    addFunction,
  };
};
