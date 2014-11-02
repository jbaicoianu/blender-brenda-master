var config = {
    // hardcoded users - v.02 should use db with hashed passwords and token store
    users: [
        {
            id: '1',
            username: 'user',
            password: 'password',
            email: 'user@domain.tld'
        }
    ],
    // the port to listen on for http and socket connections
    port: 8080,
    // session secret key 
    session_secret: 'CHANGE_THIS',
    // brenda commands - uncomment to use test script for args
    // brenda_work: __dirname + '/utils/test.sh'
    // brenda_run: __dirname + '/utils/test.sh'
    brenda_work: 'brenda-work',
    brenda_run: 'brenda-run'
};

module.exports = config;