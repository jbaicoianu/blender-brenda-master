var config = {
    // hardcoded users - v.02 should use db with hashed passwords and token store
    users: [
        {
            id:         '1',
            username:   'user',
            password:   'password',
            email:      'user@domain.tld'
        }
    ],
    // the port to listen on for http and socket connections
    port: 8080,
    // session secret key 
    session_secret: 'CHANGE_THIS',
    session_key:    'CHANGE_THIS_TOO',
    // brenda commands - uncomment to use test script for args
    // brenda_work: global.dirname + '/utils/test.sh',
    // brenda_run: global.dirname + '/utils/test.sh',
    brenda_work:    'brenda-work',
    brenda_run:     'brenda-run',
    template_dir:   global.dirname + '../templates/brenda/',
    jobdata_dir:    global.dirname + '../jobdata/',
    build_jobfile:  global.dirname + '../scripts/brenda/build-jobfile.sh',

};

module.exports = config;