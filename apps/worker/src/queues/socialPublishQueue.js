'use strict';

const { Queue } = require('bullmq');
const { redis: connection } = require('../../../backend/src/system-configs/config/redis') || { redis: null };

let socialPublishQueue = null;

if (connection) {
    socialPublishQueue = new Queue('social_publish', {
        prefix: '{bull}',
        connection,
        defaultJobOptions: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 500 }
        }
    });
}

module.exports = {
    socialPublishQueue
};
