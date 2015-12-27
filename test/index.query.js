var couchbase = require('couchbase');
var _ = require('lodash');
var expect = require('chai').expect;

var lounge = require('../lib');
var Schema = lounge.Schema;

var bucket;

describe('Model index query tests', function () {
  beforeEach(function (done) {
    if (lounge) {
      lounge.disconnect();
    }

    lounge = new lounge.Lounge(); // recreate it

    var cluster = new couchbase.Mock.Cluster('couchbase://127.0.0.1');
    bucket = cluster.openBucket('lounge_test', function (err) {
      lounge.connect({
        bucket: bucket
      }, done);
    });
  });

  it('should query using simple reference document', function (done) {
    var userSchema = lounge.schema({
      firstName: String,
      lastName: String,
      email: {type: String, index: true}
    });

    var User = lounge.model('User', userSchema);

    var userData = {
      firstName: 'Joe',
      lastName: 'Smith',
      email: 'joe@gmail.com'
    };

    var user = new User(userData);

    user.save(function (err, savedDoc) {
      expect(err).to.not.be.ok;
      expect(savedDoc).to.be.ok;


      User.findByEmail(user.email, function (err, rdoc) {
        expect(err).to.not.be.ok;

        expect(rdoc).to.be.ok;
        expect(rdoc).to.be.an('object');
        expect(rdoc).to.be.an.instanceof(User);
        expect(rdoc.id).to.be.ok;
        expect(rdoc.id).to.be.a('string');

        expect(rdoc.id).to.equal(user.id);
        expect(rdoc.firstName).to.equal(userData.firstName);
        expect(rdoc.lastName).to.equal(userData.lastName);
        expect(rdoc.email).to.equal(userData.email);

        done();
      });
    });
  });

  it('should query using simple reference document respecting key options', function (done) {
    var userSchema = lounge.schema({
      firstName: String,
      lastName: String,
      email: {type: String, index: true},
      username: {type: String, key: true, generate: false}
    });

    var User = lounge.model('User', userSchema);

    var userData = {
      firstName: 'Joe',
      lastName: 'Smith',
      email: 'joe@gmail.com',
      username: 'jsmith'
    };

    var user = new User(userData);

    user.save(function (err, savedDoc) {
      expect(err).to.not.be.ok;
      expect(savedDoc).to.be.ok;

      User.findByEmail(user.email, function (err, rdoc) {
        expect(err).to.not.be.ok;

        expect(rdoc).to.be.ok;
        expect(rdoc).to.be.an('object');
        expect(rdoc).to.be.an.instanceof(User);

        expect(rdoc.username).to.equal(user.username);
        expect(rdoc.firstName).to.equal(userData.firstName);
        expect(rdoc.lastName).to.equal(userData.lastName);
        expect(rdoc.email).to.equal(userData.email);

        done();
      });
    });
  });

  it('should query index values for array', function () {
    var userSchema = new lounge.Schema({
      firstName: String,
      lastName: String,
      usernames: [{type: String, index: true, indexName: 'username'}]
    });

    var User = lounge.model('User', userSchema);

    var user = new User({
      firstName: 'Joe',
      lastName: 'Smith',
      usernames: ['user1', 'user2']
    });

    user.save(function (err, savedDoc) {
      expect(err).to.not.be.ok;
      expect(savedDoc).to.be.ok;

      User.findByUsername(user.usernames[0], function (err, rdoc) {
        expect(err).to.not.be.ok;

        expect(rdoc).to.be.ok;
        expect(rdoc).to.be.an('object');
        expect(rdoc).to.be.an.instanceof(User);

        expect(rdoc.usernames.sort()).to.deep.equal(user.usernames.sort());
        expect(rdoc.firstName).to.equal(userData.firstName);
        expect(rdoc.lastName).to.equal(userData.lastName);
        expect(rdoc.email).to.equal(userData.email);

        User.findByUsername(user.usernames[1], function (err, rdoc) {
          expect(err).to.not.be.ok;

          expect(rdoc).to.be.ok;
          expect(rdoc).to.be.an('object');
          expect(rdoc).to.be.an.instanceof(User);

          expect(rdoc.usernames.sort()).to.deep.equal(user.usernames.sort());
          expect(rdoc.firstName).to.equal(userData.firstName);
          expect(rdoc.lastName).to.equal(userData.lastName);
          expect(rdoc.email).to.equal(userData.email);

          done();
        });
      });
    });
  });

  it('should query index value for a ref field', function () {
    var fooSchema = lounge.schema({
      a: String,
      b: String
    });

    var Foo = lounge.model('Foo', fooSchema);

    var userSchema = lounge.schema({
      firstName: String,
      lastName: String,
      email: {type: String, index: true},
      foo: {type: Foo, index: true, ref: 'Foo'}
    });

    var User = lounge.model('User', userSchema);

    var foo = new Foo({
      a: 'a1',
      b: 'b1'
    });

    var user = new User({
      firstName: 'Joe',
      lastName: 'Smith',
      email: 'joe@gmail.com',
      foo: foo
    });

    function checkRres(err, rdoc) {
      expect(err).to.not.be.ok;

      expect(rdoc).to.be.ok;
      expect(rdoc).to.be.an('object');
      expect(rdoc).to.be.an.instanceof(User);

      expect(rdoc.foo).to.deep.equal(foo.id);
      expect(rdoc.firstName).to.equal(userData.firstName);
      expect(rdoc.lastName).to.equal(userData.lastName);
      expect(rdoc.email).to.equal(userData.email);
    }

    user.save(function (err, savedDoc) {
      expect(err).to.not.be.ok;
      expect(savedDoc).to.be.ok;

      User.findByEmail(user.email, function (err, rdoc) {
        checkRres(err, rdoc);

        User.findByFoo(foo.id, function (err, rdoc) {
          checkRres(err, rdoc);

          done();
        });
      });
    });
  });

  it('should query index value for a ref field respecting key config', function () {
    var fooSchema = lounge.schema({
      a: {type: String, key: true, generate: false},
      b: String
    });

    var Foo = lounge.model('Foo', fooSchema);

    var userSchema = lounge.schema({
      firstName: String,
      lastName: String,
      email: {type: String, index: true},
      foo: {type: String, index: true, ref: 'Foo'}
    });

    var User = lounge.model('User', userSchema);

    var foo = new Foo({
      a: 'a1',
      b: 'b1'
    });

    var user = new User({
      firstName: 'Joe',
      lastName: 'Smith',
      email: 'joe@gmail.com',
      foo: foo
    });

    function checkRres(err, rdoc) {
      expect(err).to.not.be.ok;

      expect(rdoc).to.be.ok;
      expect(rdoc).to.be.an('object');
      expect(rdoc).to.be.an.instanceof(User);

      expect(rdoc.foo).to.deep.equal(foo.a);
      expect(rdoc.firstName).to.equal(userData.firstName);
      expect(rdoc.lastName).to.equal(userData.lastName);
      expect(rdoc.email).to.equal(userData.email);
    }

    user.save(function (err, savedDoc) {
      expect(err).to.not.be.ok;
      expect(savedDoc).to.be.ok;

      User.findByEmail(user.email, function (err, rdoc) {
        checkRres(err, rdoc);

        User.findByFoo(foo.a, function (err, rdoc) {
          checkRres(err, rdoc);

          done();
        });
      });
    });
  });
});