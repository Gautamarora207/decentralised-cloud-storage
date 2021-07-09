import DCS from '../abis/DCS.json'
import React, { Component } from 'react';
import Navbar from './Navbar'
import Main from './Main'
import Web3 from 'web3';
import './App.css';
import ipfs from '../ipfs'
import Torus from "@toruslabs/torus-embed";
import splitFile from 'split-file'
class App extends Component {

  async componentDidMount() {
    // await this.loadWeb3()
    await this.login()
    await this.loadBlockchainData()
  }

  async login() {
    const torus = new Torus();
    await torus.init(
      {
        network: {
          host: "http://127.0.0.1:7545", // mandatory
          chainId: 1337
        },
        showTorusButton: false,
        useLocalStorage: false,
      }
    )
    const t = await torus.login(); // await torus.ethereum.enable()
    console.log(t)
    this.setState({ torus })
    window.web3 = new Web3(torus.provider)
    const userInfo = await torus.getUserInfo();
    // const web3 = new Web3(torus.provider);
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Please install and login with MetaMask!')
    }
  }

  async loadBlockchainData() {
    const web3 = window.web3
    
    // Load account
    const accounts = await web3.eth.getAccounts()
    this.setState({ account: accounts[0] })
    // Network ID
    const networkId = await web3.eth.net.getId()
    const networkData = DCS.networks[networkId]
    if(networkData) {
      // Assign contract
      const dcs = new web3.eth.Contract(DCS.abi, networkData.address)
      this.setState({ dcs })
      // Get files amount
      const filesCount = await dcs.methods.fileCount().call()
      this.setState({ filesCount })
      // Load files&sort by the newest
      for (var i = filesCount; i >= 1; i--) {
        const file = await dcs.methods.files(i).call()
        if(file.uploader = accounts[0]) {
        this.setState({
          files: [...this.state.files, file]
        }) 
      }
      }
    } else {
      window.alert('DCS contract not deployed to detected network.')
    }
  }

  // Get file from user
  captureFile = event => {
    event.preventDefault()

    const file = event.target.files[0]
    const reader = new window.FileReader()

    reader.readAsArrayBuffer(file)
    reader.onloadend = () => {
      this.setState({
        buffer: Buffer(reader.result),
        type: file.type,
        name: file.name
      })
      console.log('buffer', this.state.buffer)
    }
  }

  uploadFile = async  (description) => {
    this.setState({ loading: true })
    console.log("Submitting file to IPFS...")

    
    const result = await ipfs.add(this.state.buffer)

      // Assign value for the file without extension
      if(this.state.type === ''){
        this.setState({type: 'none'})
      }
      this.state.dcs.methods.uploadFile(result.path, result.size, this.state.type, this.state.name, description).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.setState({
         loading: false,
         type: null,
         name: null
       })
       window.location.reload()
      }).on('error', (e) =>{
        window.alert('Error')
        this.setState({loading: false})
      })
  }

  constructor(props) {
    super(props)
    this.state = {
      account: '',
      dcs: null,
      files: [],
      loading: false,
      type: null,
      name: null,
      torus: null,
    }
    this.uploadFile = this.uploadFile.bind(this)
    this.captureFile = this.captureFile.bind(this)
  }

  render() {
    return (
      <div>
        <Navbar account={this.state.account} torus = {this.state.torus}/>
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main
              files={this.state.files}
              captureFile={this.captureFile}
              uploadFile={this.uploadFile}
            />
        }
      </div>
    );
  }
}

export default App;