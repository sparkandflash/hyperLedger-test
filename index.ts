import { AskarModule } from '@aries-framework/askar'
import * as core from '@aries-framework/core'
import { agentDependencies, HttpInboundTransport } from '@aries-framework/node'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'

const initializeBobAgent = async () => {
  // Simple agent configuration. This sets some basic fields like the wallet
  // configuration and the label. It also sets the mediator invitation url,
  // because this is most likely required in a mobile environment.
  const config: core.InitConfig = {
    label: 'demo-agent-bob',
    walletConfig: {
      id: 'mainBob',
      key: 'demoagentbob00000000000000000000',
    },
  }

  // A new instance of an agent is created here
  // Askar can also be replaced by the indy-sdk if required
  const agent = new core.Agent({
    config,
    modules: {
      askar: new AskarModule({ ariesAskar }),
      connections: new core.ConnectionsModule({ autoAcceptConnections: true }),
    },
    dependencies: agentDependencies,
  })

  // Register a simple `WebSocket` outbound transport
  agent.registerOutboundTransport(new core.WsOutboundTransport())

  // Register a simple `Http` outbound transport
  agent.registerOutboundTransport(new core.HttpOutboundTransport())

  // Initialize the agent
  await agent.initialize()

  return agent
}

const initializeAcmeAgent = async () => {
  // Simple agent configuration. This sets some basic fields like the wallet
  // configuration and the label.
  const config: core.InitConfig = {
    label: 'demo-agent-acme',
    walletConfig: {
      id: 'mainAcme',
      key: 'demoagentacme0000000000000000000',
    },
    endpoints: ['http://localhost:3001'],
  }

  // A new instance of an agent is created here
  // Askar can also be replaced by the indy-sdk if required
  const agent = new core.Agent({
    config,
    modules: {
      askar: new AskarModule({ ariesAskar }),
      connections: new core.ConnectionsModule({ autoAcceptConnections: true }),
    },
    dependencies: agentDependencies,
  })

  // Register a simple `WebSocket` outbound transport
  agent.registerOutboundTransport(new core.WsOutboundTransport())

  // Register a simple `Http` outbound transport
  agent.registerOutboundTransport(new core.HttpOutboundTransport())

  // Register a simple `Http` inbound transport
  agent.registerInboundTransport(new HttpInboundTransport({ port: 3001 }))

  // Initialize the agent
  await agent.initialize()

  return agent
}

const createNewInvitation = async (agent: core.Agent) => {
  const outOfBandRecord = await agent.oob.createInvitation()

  return {
    invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({ domain: 'https://example.org' }),
    outOfBandRecord,
  }
}

const createLegacyInvitation = async (agent: core.Agent) => {
  const { invitation } = await agent.oob.createLegacyInvitation()

  return invitation.toUrl({ domain: 'https://example.org' })
}

const receiveInvitation = async (agent: core.Agent, invitationUrl: string) => {
  const { outOfBandRecord } = await agent.oob.receiveInvitationFromUrl(invitationUrl)

  return outOfBandRecord
}

const setupConnectionListener = (agent: core.Agent, outOfBandRecord: core.OutOfBandRecord, cb: (...args: any) => void) => {
  agent.events.on<core.ConnectionStateChangedEvent>(core.ConnectionEventTypes.ConnectionStateChanged, ({ payload }) => {
    if (payload.connectionRecord.outOfBandId !== outOfBandRecord.id) return
    if (payload.connectionRecord.state === core.DidExchangeState.Completed) {
      // the connection is now ready for usage in other protocols!
      console.log(`Connection for out-of-band id ${outOfBandRecord.id} completed`)

      // Custom business logic can be included here
      // In this example we can send a basic message to the connection, but
      // anything is possible
      cb()

      // We exit the flow
      process.exit(0)
    }
  })
}


const run = async () => {
  console.log('Initializing Bob agent...')
  const bobAgent = await initializeBobAgent()
  console.log('Initializing Acme agent...')
  const acmeAgent = await initializeAcmeAgent()

  console.log('Creating the invitation as Acme...')
  const { outOfBandRecord, invitationUrl } = await createNewInvitation(acmeAgent)

  console.log('Listening for connection changes...')
  setupConnectionListener(acmeAgent, outOfBandRecord, () =>
    console.log('We now have an active connection to use in the following tutorials')
  )

  console.log('Accepting the invitation as Bob...')
  await receiveInvitation(bobAgent, invitationUrl)
}

export default run

void run()
