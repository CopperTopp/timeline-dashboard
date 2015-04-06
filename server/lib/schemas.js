module.exports = function(mongoose) {
  return {
    "Product": new mongoose.Schema({
      _id: String,
      name: String,
      releases: [{
        type: String,
        ref: 'Release'
      }],
      _type: {
        type: String,
        default: 'Product'
      }
    }),
    "Release": new mongoose.Schema({
      _id: String,
      name: String,
      product: {
        type: String,
        ref: 'Product'
      },
      description: String,
      start_time: Date,
      start_delta: Number,
      end_time: Date,
      end_delta: Number,
      state: String,
      hip_chat_room: String,
      team: {
        relman: String,
        implementer: String,
        pm: String,
        test_iota: String,
        dev: String
      },
      type: String,
      code_changes: [{
        type: String,
        ref: 'CodeChange'
      }],
      events: [{
        type: String,
        ref: 'Event'
      }],
      _type: {
        type: String,
        default: 'Release'
      }
    }),
    "CodeChange": new mongoose.Schema({
      _id: String,
      name: String,
      product: {
        type: String,
        ref: 'Product'
      },
      release: {
        type: String,
        ref: 'Release'
      },
      number: String,
      owner: String,
      creator: String,
      test_lead: String,
      team: String,
      category: String,
      gated_change: String,
      production_traffic: String,
      signoff: String,
      _type: {
        type: String,
        default: 'CodeChange'
      }
    }),
    "Event": new mongoose.Schema({
      _id: String,
      name: String,
      product: {
        type: String,
        ref: 'Product'
      },
      release: {
        type: String,
        ref: 'Release'
      },
      number: {                  //SN.record.number
        type: String
      },
      state: String,                  //change_request.record.state
      status: String,                 //change_request.record.__status
      isActive: Boolean,              //Is change_request.record.active used?
      approval: String,               //change_request.record.approval
      start_time: Date,               //change_request.record.start_date
      start_delta: Number,
      end_time: Date,                 //change_request.record.end_date
      end_delta: Number,
      actual_start_time: Date,        //change_request.record.work_start
      actual_end_time: Date,          //change_request.record.work_end
      coordinator: String,            //change_request.record.u_coordinator --> sys_user.record.sys_id
      implementor: String,            //change_request.record.assigned_to --> sys_user.record.sys_id
      environment: String,            //change_request.record.u_environment
      details: String,                //change_request.record.description
      _type: {
        type: String,
        default: 'Event'
      }
    }),
    "Service": new mongoose.Schema({
      _id: String,
      name: String,
      product: {
        type: String,
        ref: 'Product'
      },
      description: String,
      group: String,
      platform: String,
      scm: String,
      type: String,
      owner: {
        first_name: String,
        last_name: String,
        username: String,
        email: String
      },
      service_instances: [{
        type: String,
        ref: 'ServiceInstance'
      }],
      _type: {
        type: String,
        default: 'Service'
      }
    }),
    "ServiceInstance": new mongoose.Schema({
      _id: String,
      key: String,
      product: {
        type: String,
        ref: 'Product'
      },
      service: {
        type: String,
        ref: 'Service'
      },
      data_center: String,
      environment: String,
      load_balancer: String,
      nodes: [{
        type: String,
        ref: 'Node'
      }],
      _type: {
        type: String,
        default: 'ServiceInstance'
      }
    }),
    "Node": new mongoose.Schema({
      _id: String,
      name: String,
      product: {
        type: String,
        ref: 'Product'
      },
      service: {
        type: String,
        ref: 'Service'
      },
      service_instance: {
        type: String,
        ref: 'ServiceInstance'
      },
      health_status: String,
      ip_addresses: {
        ip_address: String,
        endpoint: {
          port: String,
          protocol: String,
          rotation_status: String,
          rotation_type: String
        }
      },
      machine: {
        name: String,
        fqdn: String,
        ip_address: String
      },
      _type: {
        type: String,
        default: 'Node'
      }
    })
  }
};