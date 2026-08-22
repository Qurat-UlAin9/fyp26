const { createUserCrudRouter } = require('../utils/crudRouteFactory');
const fields = ['title','status','summary','metadata'];
module.exports = createUserCrudRouter({ table: 'ai_conversations', allowedInsert: fields, allowedUpdate: fields });
